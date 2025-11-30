variable "aws_region" {
  description = "AWS region for NovaMart dev resources."
  type        = string
  default     = "us-east-1"
}

variable "db_username" {
  description = "Username for the dev PostgreSQL catalog database."
  type        = string
  default     = "novamart"
}

variable "db_password" {
  description = "Password for the dev PostgreSQL catalog database."
  type        = string
  sensitive   = true
}

variable "kafka_bootstrap_servers" {
  description = "List of bootstrap servers for the dev Kafka cluster (MSK or local)."
  type        = list(string)
  default     = ["localhost:9092"]
}

variable "kafka_sasl_username" {
  description = "SASL username for Kafka, if required."
  type        = string
  default     = ""
}

variable "kafka_sasl_password" {
  description = "SASL password for Kafka, if required."
  type        = string
  default     = ""
  sensitive   = true
}

variable "kafka_tls_enabled" {
  description = "Whether TLS is enabled for Kafka connections."
  type        = bool
  default     = false
}

