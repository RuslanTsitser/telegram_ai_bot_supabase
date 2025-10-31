#!/bin/bash

function=$1

supabase functions deploy $function --project-ref cmztehabpooymgggejgg --no-verify-jwt
