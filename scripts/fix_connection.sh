#!/bin/bash

supabase stop
rm supabase/.temp/postgres-version
supabase start