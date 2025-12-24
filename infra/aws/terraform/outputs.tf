# RDS Outputs
output "rds_endpoint" {
  description = "PostgreSQL RDS endpoint"
  value       = aws_db_instance.novamart_catalog_db.endpoint
}

output "rds_address" {
  description = "PostgreSQL RDS address (without port)"
  value       = aws_db_instance.novamart_catalog_db.address
}

output "rds_port" {
  description = "PostgreSQL RDS port"
  value       = aws_db_instance.novamart_catalog_db.port
}

output "rds_database_name" {
  description = "PostgreSQL database name"
  value       = aws_db_instance.novamart_catalog_db.db_name
}

output "rds_username" {
  description = "PostgreSQL master username"
  value       = aws_db_instance.novamart_catalog_db.username
  sensitive   = true
}

# DynamoDB Outputs
output "dynamodb_inventory_table" {
  description = "Inventory DynamoDB table name"
  value       = aws_dynamodb_table.inventory.name
}

output "dynamodb_inventory_arn" {
  description = "Inventory DynamoDB table ARN"
  value       = aws_dynamodb_table.inventory.arn
}

output "dynamodb_shipments_table" {
  description = "Shipments DynamoDB table name"
  value       = aws_dynamodb_table.shipments.name
}

output "dynamodb_shipments_arn" {
  description = "Shipments DynamoDB table ARN"
  value       = aws_dynamodb_table.shipments.arn
}

# S3 Outputs
output "s3_assets_bucket" {
  description = "S3 bucket for assets"
  value       = aws_s3_bucket.assets.id
}

output "s3_assets_arn" {
  description = "S3 assets bucket ARN"
  value       = aws_s3_bucket.assets.arn
}

output "s3_assets_region" {
  description = "S3 assets bucket region"
  value       = aws_s3_bucket.assets.region
}

# Connection Strings
output "catalog_service_connection_string" {
  description = "JDBC connection string for catalog service"
  value       = "jdbc:postgresql://${aws_db_instance.novamart_catalog_db.endpoint}/${aws_db_instance.novamart_catalog_db.db_name}"
  sensitive   = true
}

output "order_service_connection_string" {
  description = "JDBC connection string for order service"
  value       = "jdbc:postgresql://${aws_db_instance.novamart_catalog_db.endpoint}/${aws_db_instance.novamart_catalog_db.db_name}"
  sensitive   = true
}

# Summary
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    rds_endpoint         = aws_db_instance.novamart_catalog_db.endpoint
    inventory_table      = aws_dynamodb_table.inventory.name
    shipments_table      = aws_dynamodb_table.shipments.name
    assets_bucket        = aws_s3_bucket.assets.id
    region              = var.aws_region
  }
}
