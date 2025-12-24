terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

########################
# RDS PostgreSQL (dev) #
########################

# Security group for RDS
resource "aws_security_group" "rds_sg" {
  name        = "novamart-rds-sg"
  description = "Security group for NovaMart RDS PostgreSQL"

  ingress {
    description = "PostgreSQL from anywhere (dev only)"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # WARNING: For dev only! Restrict in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "novamart-rds-sg"
    Environment = "dev"
  }
}

resource "aws_db_instance" "novamart_catalog_db" {
  identifier = "novamart-catalog-dev-db"

  engine         = "postgres"
  # Let AWS select a supported minor version for Postgres 15 in this region.
  engine_version = "15"

  instance_class = "db.t4g.micro"

  allocated_storage    = 20
  max_allocated_storage = 50

  # Use a non-reserved database name for Postgres.
  db_name  = "novamart_catalog"
  username = var.db_username
  password = var.db_password

  publicly_accessible    = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  storage_type           = "gp3"

  backup_retention_period = 1
  skip_final_snapshot     = true

  deletion_protection = false

  tags = {
    Name        = "novamart-catalog-db-dev"
    Environment = "dev"
    Service     = "catalog-service"
  }
}

###########################
# DynamoDB: inventory     #
###########################

resource "aws_dynamodb_table" "inventory" {
  name         = "inventory"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "productId"

  attribute {
    name = "productId"
    type = "S"
  }

  tags = {
    Name        = "novamart-inventory-dev"
    Environment = "dev"
    Service     = "inventory-service"
  }
}

###########################
# S3: novamart-assets     #
###########################

resource "aws_s3_bucket" "assets" {
  bucket = "novamart-assets"

  tags = {
    Name        = "novamart-assets-dev"
    Environment = "dev"
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

###########################
# Dynamo DB - Shipment     #
###########################

resource "aws_dynamodb_table" "shipments" {
  name         = "shipments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "shipmentId"

  attribute {
    name = "shipmentId"
    type = "S"
  }

  attribute {
    name = "orderId"
    type = "S"
  }

  global_secondary_index {
    name            = "orderId-index"
    hash_key        = "orderId"
    projection_type = "ALL"
  }
}

###########################
# DynamoDB: payments      #
###########################

resource "aws_dynamodb_table" "payments" {
  name         = "payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "paymentId"

  attribute {
    name = "paymentId"
    type = "S"
  }

  attribute {
    name = "orderId"
    type = "S"
  }

  global_secondary_index {
    name            = "orderId-index"
    hash_key        = "orderId"
    projection_type = "ALL"
  }

  tags = {
    Name        = "novamart-payments"
    Environment = "dev"
    Service     = "payment-service"
  }
}

###########################
# DynamoDB: refunds       #
###########################

resource "aws_dynamodb_table" "refunds" {
  name         = "refunds"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "refundId"

  attribute {
    name = "refundId"
    type = "S"
  }

  attribute {
    name = "paymentId"
    type = "S"
  }

  attribute {
    name = "orderId"
    type = "S"
  }

  global_secondary_index {
    name            = "paymentId-index"
    hash_key        = "paymentId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "orderId-index"
    hash_key        = "orderId"
    projection_type = "ALL"
  }

  tags = {
    Name        = "novamart-refunds"
    Environment = "dev"
    Service     = "payment-service"
  }
}