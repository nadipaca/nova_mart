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

  publicly_accessible = true
  storage_type        = "gp3"

  backup_retention_period = 1
  skip_final_snapshot     = true

  deletion_protection = false

  # For dev, rely on default VPC/subnets and security groups.

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
