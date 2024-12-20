#!/bin/bash

# Apply CRD
kubectl apply -f kubernetes/airtable-sync-crd.yaml

# Apply RBAC
kubectl apply -f kubernetes/airtable-sync-controller-rbac.yaml

# Apply ConfigMap and Secret
kubectl apply -f kubernetes/airtable-config-configmap.yaml
kubectl apply -f kubernetes/airtable-credentials-secret.yaml

# Apply Deployment
kubectl apply -f kubernetes/airtable-sync-controller-deployment.yaml

echo "Deployment complete!"