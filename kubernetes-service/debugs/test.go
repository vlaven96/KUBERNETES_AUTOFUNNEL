package main

import (
	"fmt"
	"log"

	"github.com/mehanizm/airtable"
)

type AirtableRecord struct {
	ID            string
	Username      string
	Password      string
	CupidToken    string
	ModelName     string
	ProxyHost     string
	ProxyUsername string
	ProxyPassword string
}

func fetchAirtableRecords(client *airtable.Client) ([]AirtableRecord, error) {
	table := client.GetTable("appiaCnT5CjmEukDq", "tblmuTTidcm3zJDSL")
	records, err := table.GetRecords().
		FromView("mrfans").
		Do()
	if err != nil {
		return nil, err
	}

	var airtableRecords []AirtableRecord
	for _, record := range records.Records {
		airtableRecords = append(airtableRecords, AirtableRecord{
			ID:            record.ID,
			Username:      record.Fields["Username"].(string),
			Password:      record.Fields["Password"].(string),
			CupidToken:    "5cb75ec7721e3ed209fa22fc55480edf",
			ModelName:     "zara",
			ProxyHost:     record.Fields["Proxy_Host"].([]interface{})[0].(string),
			ProxyUsername: record.Fields["Proxy_Username"].([]interface{})[0].(string),
			ProxyPassword: record.Fields["Proxy_Password"].([]interface{})[0].(string),
		})
	}

	return airtableRecords, nil
}

func main() {
	// Create Airtable client with hardcoded API key
	airtableClient := airtable.NewClient("patx9H8Z5CpvEQCZ1.5b02ca1438712d21ac7809e82b6bead7bc2512e54ce0676b6bde72e09eb8e7bf")

	// Fetch Airtable records
	records, err := fetchAirtableRecords(airtableClient)
	if err != nil {
		log.Fatalf("Error fetching Airtable records: %v", err)
	}

	// Print the records
	for _, record := range records {
		fmt.Printf("ID: %s, Username: %s, Password: %s, CupidToken: %s, ModelName: %s, ProxyHost: %s, ProxyUsername: %s\n",
			record.ID, record.Username, record.Password, record.CupidToken, record.ModelName, record.ProxyHost, record.ProxyUsername)
	}
}
