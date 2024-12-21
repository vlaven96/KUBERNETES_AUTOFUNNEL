package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"
	"github.com/mehanizm/airtable"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// AirtableRecord represents a record from the Airtable table
type AirtableRecord struct {
	ID            string
	Username      string
	Password      string
	CupidToken    string
	HotbotToken   string
	ModelName     string
	ProxyHost     string
	Tag           string
	ProxyUsername string
	ProxyPassword string
	TwoFASecret   string
}

type Proxy struct {
	ID            int    `json:"id"`
	Host          string `json:"host"`
	Port          int    `json:"port"`
	ProxyUsername string `json:"proxy_username"`
	ProxyPassword string `json:"proxy_password"`
}

type SnapchatAccount struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	SnapchatLink string `json:"snapchat_link"`
	TwoFASecret  string `json:"two_fa_secret"`
	Status       string `json:"status"`
	Proxy        *Proxy `json:"proxy"`
	Tag          string `json:"tag"`
}


func getFirstString(field interface{}) (string, bool) {
	if field == nil {
		return "", false
	}
	array, ok := field.([]interface{})
	if !ok || len(array) == 0 {
		return "", false
	}
	str, ok := array[0].(string)
	return str, ok
}
func fetchSnapchatAccounts() ([]SnapchatAccount, error) {
	log.Println("Fetching Snapchat accounts...")

	// Retrieve the API key from the environment variable
	apiKey := os.Getenv("DPA_PLATFORM_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("DPA_PLATFORM_API_KEY is not set")
	}

	// Create the request
	req, err := http.NewRequest("GET", "http://138.201.226.205:8000/accounts?status=GOOD_STANDING", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set the x-api-key header
	req.Header.Set("x-api-key", apiKey)

	// Perform the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform request: %v", err)
	}
	defer resp.Body.Close()

	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Parse the response body
	var accounts []SnapchatAccount
	if err := json.NewDecoder(resp.Body).Decode(&accounts); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}
	log.Printf("Displaying all accounts after Decode_______________")
	for _, account := range accounts {
		fmt.Printf("%+v\n", account)
	}
	
	log.Printf("Fetched %d Snapchat accounts", len(accounts))
	return accounts, nil
}

func deploymentExistsForAccount(deployments *appsv1.DeploymentList, account SnapchatAccount) bool {
	log.Printf("Checking if deployment exists for account ID: %d", account.ID)
	for _, deployment := range deployments.Items {
		if deployment.Labels["snapchat-account-id"] == fmt.Sprintf("%d", account.ID) {
			log.Printf("Deployment exists for account ID: %d", account.ID)
			return true
		}
	}
	log.Printf("No deployment found for account ID: %d", account.ID)
	return false
}

func formatUsername(username string) string {
	username = strings.ReplaceAll(username, ".", "")
	username = strings.ReplaceAll(username, "_", "")
	username = strings.ReplaceAll(username, "-", "")
	username = strings.ToLower(username)
	randomDigits := fmt.Sprintf("%03d", rand.Intn(1000))
	return fmt.Sprintf("%s%s", username, randomDigits)
}

func createDeploymentForAccount(clientset *kubernetes.Clientset, account SnapchatAccount) error {
	log.Printf("Creating deployment for account ID: %d, Username: %s", account.ID, account.Username)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("sc-%s", formatUsername(account.Username)),
			Namespace: os.Getenv("POD_NAMESPACE"),
			Labels: map[string]string{
				"app":                "sc",
				"snapchat-account-id": fmt.Sprintf("%d", account.ID),
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(1),
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app":                "sc",
					"snapchat-account-id": fmt.Sprintf("%d", account.ID),
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app":                "sc",
						"snapchat-account-id": fmt.Sprintf("%d", account.ID),
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "sc",
							Image: "docker.io/adicraciun/afn:latest",
							Env: []corev1.EnvVar{
								{Name: "USERNAME", Value: account.Username},
								{Name: "PASSWORD", Value: account.Password},
								{Name: "CUPID_TOKEN", Value: func() string {
									if account.Status == "HOTBOT" {
										return os.Getenv("HOTBOT_TOKEN")
									}
									return os.Getenv("CUPID_TOKEN")
								}()},
								{Name: "MODEL_NAME", Value: account.SnapchatLink},
								{Name: "PROXY_HOST", Value: account.Proxy.Host},
								{Name: "PROXY_USERNAME", Value: account.Proxy.ProxyUsername},
								{Name: "PROXY_PASSWORD", Value: account.Proxy.ProxyPassword},
								{Name: "TWOFA_SECRET", Value: account.TwoFASecret},
								{Name: "isHotBot", Value: func() string {
									if account.Tag == "HOTBOT" {
										return "true"
									}
									return "false"
								}()},
								{Name: "PROXY_PORT", Value: fmt.Sprintf("%d", account.Proxy.Port)},
							},
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceMemory: resource.MustParse("1.5Gi"),
									corev1.ResourceCPU:    resource.MustParse("0.8"),
								},
								Limits: corev1.ResourceList{
									corev1.ResourceMemory: resource.MustParse("4Gi"),
								},
							},
						},
					},
				},
			},
		},
	}

	_, err := clientset.AppsV1().Deployments(os.Getenv("POD_NAMESPACE")).Create(context.TODO(), deployment, metav1.CreateOptions{})
	if err != nil {
		log.Printf("Error creating deployment for account ID: %d: %v", account.ID, err)
	} else {
		log.Printf("Successfully created deployment for account ID: %d", account.ID)
	}
	return err
}

func recordExistsForDeployment(records []SnapchatAccount, deployment appsv1.Deployment) bool {
	recordID := deployment.Labels["snapchat-account-id"]
	log.Printf("Checking if record exists for deployment with record ID: %s", recordID)
	for _, record := range records {
		if fmt.Sprintf("%d", record.ID) == recordID {
			log.Printf("Record exists for deployment with record ID: %s", recordID)
			return true
		}
	}
	log.Printf("No record found for deployment with record ID: %s", recordID)
	return false
}

func syncAirtableWithKubernetes(clientset *kubernetes.Clientset, airtableClient *airtable.Client) error {
	log.Println("Starting sync between Airtable and Kubernetes...")

	// Fetch Airtable records
	// records, err := fetchAirtableRecords(airtableClient)
	accounts, err := fetchSnapchatAccounts()
	if err != nil {
		log.Printf("Error fetching Airtable records: %v", err)
		return err
	}

	// Get existing deployments
	log.Println("Fetching existing deployments from Kubernetes...")
	deployments, err := clientset.AppsV1().Deployments(os.Getenv("POD_NAMESPACE")).List(context.TODO(), metav1.ListOptions{
		LabelSelector: "app=sc",
	})
	if err != nil {
		log.Printf("Error fetching deployments from Kubernetes: %v", err)
		return err
	}
	log.Printf("Fetched %d deployments from Kubernetes", len(deployments.Items))

	// Create deployments for new Airtable records
	newDeploymentsCount := 0
	for _, account := range accounts {
		if newDeploymentsCount >= 50 {
			log.Println("Reached maximum limit of 50 new deployments")
			break
		}
		if !deploymentExistsForAccount(deployments, account) {
			// Check for pending pods
			pendingPods, err := clientset.CoreV1().Pods(os.Getenv("POD_NAMESPACE")).List(context.TODO(), metav1.ListOptions{
				LabelSelector: "app=sc,status=pending",
			})
			if err != nil {
				log.Printf("Error fetching pending pods: %v", err)
				continue
			}
			if len(pendingPods.Items) > 0 {
				log.Println("There are pending pods, skipping new deployment creation")
				break
			}

			err = createDeploymentForAccount(clientset, account)
			if err != nil {
				log.Printf("Error creating deployment for account %d: %v", account.ID, err)
			} else {
				newDeploymentsCount++
			}
			time.Sleep(5 * time.Second) // Pause for 5 seconds between each deployment
		}
	}

	// Delete deployments that don't have corresponding Airtable records
	for _, deployment := range deployments.Items {
		if !recordExistsForDeployment(accounts, deployment) {
			log.Printf("Deleting deployment with name: %s", deployment.Name)
			err := clientset.AppsV1().Deployments(os.Getenv("POD_NAMESPACE")).Delete(context.TODO(), deployment.Name, metav1.DeleteOptions{})
			if err != nil {
				log.Printf("Error deleting deployment %s: %v", deployment.Name, err)
			} else {
				log.Printf("Successfully deleted deployment with name: %s", deployment.Name)
			}
		}
	}

	log.Println("Sync between Airtable and Kubernetes completed successfully")
	return nil
}

func main() {
	log.Println("Starting Airtable Sync Controller...")

	// Create the in-cluster config
	log.Println("Creating in-cluster Kubernetes config...")
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("Error creating in-cluster config: %v", err)
	}

	// Create the clientset
	log.Println("Creating Kubernetes clientset...")
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Error creating Kubernetes clientset: %v", err)
	}

	// Create Airtable client
	log.Println("Creating Airtable client...")
	airtableClient := airtable.NewClient(os.Getenv("AIRTABLE_API_KEY"))

	// Get the sync interval from the environment variable
	log.Println("Parsing sync interval from environment variable...")
	syncInterval, err := time.ParseDuration(os.Getenv("SYNC_INTERVAL") + "s")
	if err != nil {
		log.Printf("Error parsing sync interval, defaulting to 2 minutes: %v", err)
		syncInterval = 1 * time.Minute // Default to 2 minutes if parsing fails
	}

	for {
		log.Println("Starting sync cycle...")
		err := syncAirtableWithKubernetes(clientset, airtableClient)
		if err != nil {
			log.Printf("Error syncing Airtable with Kubernetes: %v", err)
		}
		log.Printf("Sync cycle completed, sleeping for %v...", syncInterval)
		time.Sleep(syncInterval)
	}
}

func int32Ptr(i int32) *int32 { return &i }
