#!/bin/bash
# Intune compliance script — proxy must be ready on localhost.
curl -sf http://127.0.0.1:8787/readyz | grep -q '"ready": true'
