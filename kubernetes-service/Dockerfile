# Use the official Golang image as the base image
FROM golang:1.17-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY src/main.go .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o airtable-sync-controller main.go

# Use a small alpine image for the final image
FROM alpine:3.14

# Install CA certificates and curl
RUN apk --no-cache add ca-certificates curl

# Copy the binary from the builder stage
COPY --from=builder /app/airtable-sync-controller /airtable-sync-controller

# Set the entrypoint
ENTRYPOINT ["/airtable-sync-controller"]