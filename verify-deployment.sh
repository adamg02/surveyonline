#!/bin/bash

# Deployment Verification Script for Render.com
# Run this script to verify the deployment is working correctly

echo "🚀 SurveyOnline Deployment Verification"
echo "======================================="

# Configuration
FRONTEND_URL="https://surveyonline-frontend.onrender.com"
API_URL="https://surveyonline-api.onrender.com"

echo "Frontend URL: $FRONTEND_URL"
echo "API URL: $API_URL"
echo ""

# Test 1: Frontend accessibility
echo "1. Testing frontend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

# Test 2: API health check
echo "2. Testing API health check..."
HEALTH_RESPONSE=$(curl -s "$API_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ API health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ API health check failed"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test 3: Database connectivity (through API)
echo "3. Testing database connectivity..."
SURVEYS_RESPONSE=$(curl -s -w "%{http_code}" "$API_URL/api/surveys" -o /tmp/surveys_test)
SURVEYS_STATUS=$(tail -c 3 /tmp/surveys_test)
if [ "$SURVEYS_STATUS" = "200" ]; then
    echo "✅ Database connection working"
else
    echo "❌ Database connection issue (Status: $SURVEYS_STATUS)"
fi

# Test 4: CORS configuration
echo "4. Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -I -H "Origin: $FRONTEND_URL" "$API_URL/api/health" | grep -i "access-control-allow-origin")
if [ ! -z "$CORS_RESPONSE" ]; then
    echo "✅ CORS is configured"
else
    echo "⚠️  CORS headers not found (may need verification)"
fi

# Test 5: SSL/HTTPS
echo "5. Testing SSL certificates..."
if curl -s "$FRONTEND_URL" | grep -q "<!DOCTYPE html>"; then
    echo "✅ Frontend SSL working"
else
    echo "❌ Frontend SSL issue"
fi

if curl -s "$API_URL/api/health" | grep -q "ok"; then
    echo "✅ API SSL working"
else
    echo "❌ API SSL issue"
fi

echo ""
echo "🏁 Verification Complete"
echo "======================="

# Summary
echo "Summary:"
echo "- Frontend: $FRONTEND_URL"
echo "- API: $API_URL"
echo "- Health Check: $API_URL/api/health"
echo ""
echo "Manual verification steps:"
echo "1. Open frontend URL in browser"
echo "2. Register a new user account"
echo "3. Create a test survey"
echo "4. Take the survey"
echo "5. View results"
echo ""
echo "Admin access:"
echo "- Check Render dashboard for auto-generated admin credentials"
echo "- Login with admin account to access all features"

# Cleanup
rm -f /tmp/surveys_test