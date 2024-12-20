# Airtable Sync Controller

This project synchronizes Airtable records with Kubernetes pods.

## Prerequisites

- Docker
- Kubernetes cluster
- kubectl configured to access your cluster

## Building and Deploying

1. Build the Docker image:

   ```
   make build
   ```

2. Push the Docker image to the repository:

   ```
   make push
   ```

3. Deploy the controller to your Kubernetes cluster:
   ```
   make deploy
   ```

## Configuration

Update the following files with your specific configuration:

- `kubernetes/airtable-credentials-secret.yaml`: Add your Airtable API key
- `kubernetes/airtable-config-configmap.yaml`: Add your Airtable base ID and table name

## Cleanup

To remove the controller and associated resources from your cluster:
