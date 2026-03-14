#!/bin/bash

# Check if MongoDB is accepting connections
if mongosh --eval 'db.runCommand("ping").ok' --quiet; then
  # Check if initialization collection exists
  initData=$(mongosh --quiet --eval 'db.getCollection("init_complete").findOne()')
  if [ "$initData" != "null" ]; then
    exit 0
  else
    exit 1
  fi
else
  exit 1
fi