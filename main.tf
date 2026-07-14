terraform {
  required_version = ">= 1.0"
}

resource "aws_s3_bucket" "codacy_checkov_boundary_probe" {
  bucket = "codacy-checkov-boundary-probe-20260715"
}