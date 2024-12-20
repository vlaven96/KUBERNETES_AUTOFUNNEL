package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
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
func fetchAirtableRecords(client *airtable.Client) ([]AirtableRecord, error) {
	log.Println("Fetching records from Airtable...")
	table := client.GetTable(os.Getenv("AIRTABLE_BASE_ID"), os.Getenv("AIRTABLE_TABLE_NAME"))
	viewName := os.Getenv("AIRTABLE_VIEW_NAME")

	var airtableRecords []AirtableRecord
	offset := ""
	for {
		records, err := table.GetRecords().
			FromView(viewName).
			WithOffset(offset).
			Do()
		if err != nil {
			log.Printf("Error fetching records from Airtable: %v", err)
			return nil, err
		}

		for _, record := range records.Records {
			log.Printf("Processing record with ID: %s", record.ID)
			username, ok := record.Fields["Username"].(string)
			if !ok {
				log.Printf("Skipping record with ID: %s due to missing Username", record.ID)
				continue
			}
			password, ok := record.Fields["Password"].(string)
			if !ok {
				log.Printf("Skipping record with ID: %s due to missing Password", record.ID)
				continue
			}
			proxyHost, ok := getFirstString(record.Fields["Proxy_Host"])
			if !ok {
				log.Printf("Skipping record with ID: %s due to missing Proxy_Host", record.ID)
				continue
			}
			proxyUsername, ok := getFirstString(record.Fields["Proxy_Username"])
			if !ok {
				log.Printf("Skipping record with ID: %s due to missing Proxy_Username", record.ID)
				continue
			}
			proxyPassword, ok := getFirstString(record.Fields["Proxy_Password"])
			if !ok {
				log.Printf("Skipping record with ID: %s due to missing Proxy_Password", record.ID)
				continue
			}
			twoFASecret, ok := record.Fields["TWOFA_SECRET"].(string)
			if !ok {
				twoFASecret = ""
			}
			modelName, ok := record.Fields["Model"].(string)
			if !ok {
				log.Printf("Skipping record with ID: %s due to missing Model", record.ID)
				continue
			}
			tag, ok := record.Fields["TAG"].(string)
			if !ok {
				tag = ""
			}

			airtableRecords = append(airtableRecords, AirtableRecord{
				ID:            record.ID,
				Username:      username,
				Password:      password,
				CupidToken:    os.Getenv("CUPID_TOKEN"),
				HotbotToken:   os.Getenv("HOTBOT_TOKEN"),
				Tag:           tag,
				ModelName:     modelName,
				ProxyHost:     proxyHost,
				ProxyUsername: proxyUsername,
				ProxyPassword: proxyPassword,
				TwoFASecret:   twoFASecret,
			})
		}

		if records.Offset == "" {
			break
		}
		offset = records.Offset
	}

	log.Printf("Fetched %d records from Airtable", len(airtableRecords))
	return airtableRecords, nil
}

func deploymentExistsForRecord(deployments *appsv1.DeploymentList, record AirtableRecord) bool {
	log.Printf("Checking if deployment exists for record ID: %s", record.ID)
	for _, deployment := range deployments.Items {
		if deployment.Labels["airtable-record-id"] == record.ID {
			log.Printf("Deployment exists for record ID: %s", record.ID)
			return true
		}
	}
	log.Printf("No deployment found for record ID: %s", record.ID)
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

func createDeploymentForRecord(clientset *kubernetes.Clientset, record AirtableRecord) error {
	log.Printf("Creating deployment for record ID: %s, Username: %s", record.ID, record.Username)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("sc-%s", formatUsername(record.Username)),
			Namespace: os.Getenv("POD_NAMESPACE"),
			Labels: map[string]string{
				"app":                "sc",
				"airtable-record-id": record.ID,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(1),
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app":                "sc",
					"airtable-record-id": record.ID,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app":                "sc",
						"airtable-record-id": record.ID,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "sc",
							Image: "docker.io/adicraciun/afn:latest",
							Env: []corev1.EnvVar{
								{Name: "USERNAME", Value: record.Username},
								{Name: "PASSWORD", Value: record.Password},
								{Name: "CUPID_TOKEN", Value: func() string {
									if record.Tag == "HOTBOT" {
										return record.HotbotToken
									}
									return record.CupidToken
								}()},
								{Name: "MODEL_NAME", Value: record.ModelName},
								{Name: "PROXY_HOST", Value: record.ProxyHost},
								{Name: "PROXY_USERNAME", Value: record.ProxyUsername},
								{Name: "PROXY_PASSWORD", Value: record.ProxyPassword},
								{Name: "TWOFA_SECRET", Value: record.TwoFASecret},
								{Name: "isHotBot", Value: func() string {
									if record.Tag == "HOTBOT" {
										return "true"
									}
									return "false"
								}()},
								{Name: "PROXY_PORT", Value: "44445"}, // Updated hardcoded PROXY_PORT
							},
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceMemory: resource.MustParse("1.25Gi"),
									corev1.ResourceCPU:    resource.MustParse("0.4"),
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
		log.Printf("Error creating deployment for record ID: %s: %v", record.ID, err)
	} else {
		log.Printf("Successfully created deployment for record ID: %s", record.ID)
	}
	return err
}

func recordExistsForDeployment(records []AirtableRecord, deployment appsv1.Deployment) bool {
	recordID := deployment.Labels["airtable-record-id"]
	log.Printf("Checking if record exists for deployment with record ID: %s", recordID)
	for _, record := range records {
		if record.ID == recordID {
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
	records, err := fetchAirtableRecords(airtableClient)
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
	for _, record := range records {
		if newDeploymentsCount >= 50 {
			log.Println("Reached maximum limit of 50 new deployments")
			break
		}
		if !deploymentExistsForRecord(deployments, record) {
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

			err = createDeploymentForRecord(clientset, record)
			if err != nil {
				log.Printf("Error creating deployment for record %s: %v", record.ID, err)
			} else {
				newDeploymentsCount++
			}
			time.Sleep(5 * time.Second) // Pause for 5 seconds between each deployment
		}
	}

	// Delete deployments that don't have corresponding Airtable records
	for _, deployment := range deployments.Items {
		if !recordExistsForDeployment(records, deployment) {
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
