#!/bin/bash

# Firebase Cloud Functions - Automated Deployment Script
# This script automates the setup and deployment of Cloud Functions for TaskSync

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Main deployment script
main() {
    print_header "TaskSync Firebase Cloud Functions Deployment"
    echo ""
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Login to Firebase
    login_firebase
    
    # Step 3: Set project ID
    set_project
    
    # Step 4: Install dependencies
    install_dependencies
    
    # Step 5: Build Cloud Functions
    build_functions
    
    # Step 6: Configure environment variables
    configure_env
    
    # Step 7: Deploy Cloud Functions
    deploy_functions
    
    # Step 8: Verify deployment
    verify_deployment
    
    # Step 9: Run tests
    test_functions
    
    print_header "Deployment Complete!"
    print_success "Firebase Cloud Functions are now live"
    echo ""
    print_info "Next steps:"
    echo "  1. Monitor logs: firebase functions:log"
    echo "  2. Check email delivery in EmailJS dashboard"
    echo "  3. Verify scheduled runs at configured times"
    echo ""
}

# Check if required tools are installed
check_prerequisites() {
    print_header "Step 1: Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+"
        exit 1
    fi
    print_success "Node.js installed: $(node -v)"
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found. Installing..."
        npm install -g firebase-tools
        print_success "Firebase CLI installed"
    else
        print_success "Firebase CLI installed: $(firebase -v)"
    fi
    
    # Check .env file
    if [ ! -f ".env" ]; then
        print_error ".env file not found in current directory"
        print_info "Create .env with EmailJS credentials before proceeding"
        exit 1
    fi
    print_success ".env file found"
    
    echo ""
}

# Login to Firebase
login_firebase() {
    print_header "Step 2: Firebase Login"
    
    if firebase projects:list &> /dev/null; then
        print_success "Already authenticated with Firebase"
    else
        print_info "Logging in to Firebase..."
        firebase login
        print_success "Firebase login successful"
    fi
    
    echo ""
}

# Set Firebase project ID
set_project() {
    print_header "Step 3: Setting Firebase Project"
    
    print_info "Available projects:"
    firebase projects:list --limit=10
    
    echo ""
    read -p "Enter your Firebase project ID (e.g., tasksync-70aa9): " PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        print_error "Project ID cannot be empty"
        exit 1
    fi
    
    firebase use "$PROJECT_ID"
    print_success "Project set to: $PROJECT_ID"
    
    echo ""
}

# Install dependencies
install_dependencies() {
    print_header "Step 4: Installing Dependencies"
    
    if [ ! -d "functions" ]; then
        print_error "functions directory not found"
        exit 1
    fi
    
    cd functions
    print_info "Installing npm packages in functions directory..."
    npm install --quiet
    print_success "Dependencies installed"
    cd ..
    
    echo ""
}

# Build Cloud Functions
build_functions() {
    print_header "Step 5: Building Cloud Functions"
    
    cd functions
    print_info "Compiling TypeScript to JavaScript..."
    npm run build > /dev/null 2>&1
    
    if [ -d "lib" ]; then
        print_success "Build successful. Output in: functions/lib/"
        ls -la lib/ | head -5
    else
        print_error "Build failed. Check functions/src/ for errors"
        exit 1
    fi
    
    cd ..
    echo ""
}

# Configure Firebase environment variables
configure_env() {
    print_header "Step 6: Configuring Environment Variables"
    
    # Extract values from .env file
    EMAILJS_SERVICE_ID=$(grep -E '^EMAILJS_SERVICE_ID=' .env | cut -d '=' -f2)
    EMAILJS_TEMPLATE_ID=$(grep -E '^EMAILJS_TEMPLATE_ID=' .env | cut -d '=' -f2)
    EMAILJS_OVERDUE_TEMPLATE_ID=$(grep -E '^EMAILJS_OVERDUE_TEMPLATE_ID=' .env | cut -d '=' -f2)
    EMAILJS_PUBLIC_KEY=$(grep -E '^EMAILJS_PUBLIC_KEY=' .env | cut -d '=' -f2)
    FRONTEND_URL=$(grep -E '^FRONTEND_URL=' .env | cut -d '=' -f2)
    
    if [ -z "$EMAILJS_SERVICE_ID" ]; then
        print_warning "EmailJS Service ID not found in .env"
        read -p "Enter EmailJS Service ID: " EMAILJS_SERVICE_ID
    fi
    
    if [ -z "$EMAILJS_TEMPLATE_ID" ]; then
        print_warning "EmailJS Template ID not found in .env"
        read -p "Enter EmailJS Template ID (nearly due): " EMAILJS_TEMPLATE_ID
    fi
    
    print_info "Setting Firebase environment variables..."
    firebase functions:config:set emailjs.service_id="$EMAILJS_SERVICE_ID" > /dev/null 2>&1
    firebase functions:config:set emailjs.template_id="$EMAILJS_TEMPLATE_ID" > /dev/null 2>&1
    
    if [ -n "$EMAILJS_OVERDUE_TEMPLATE_ID" ]; then
        firebase functions:config:set emailjs.overdue_template_id="$EMAILJS_OVERDUE_TEMPLATE_ID" > /dev/null 2>&1
    fi
    
    if [ -n "$EMAILJS_PUBLIC_KEY" ]; then
        firebase functions:config:set emailjs.public_key="$EMAILJS_PUBLIC_KEY" > /dev/null 2>&1
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        firebase functions:config:set app.frontend_url="$FRONTEND_URL" > /dev/null 2>&1
    fi
    
    print_success "Environment variables configured"
    print_info "Configured values:"
    firebase functions:config:get | jq . || echo "(Could not display config)"
    
    echo ""
}

# Deploy Cloud Functions
deploy_functions() {
    print_header "Step 7: Deploying Cloud Functions"
    
    print_info "Deploying to Firebase..."
    
    if firebase deploy --only functions; then
        print_success "Deployment successful!"
    else
        print_error "Deployment failed. Check error messages above"
        exit 1
    fi
    
    echo ""
}

# Verify deployment
verify_deployment() {
    print_header "Step 8: Verifying Deployment"
    
    print_info "Checking deployed functions..."
    
    if firebase functions:list | grep -q "sendNearlyDueReminder"; then
        print_success "sendNearlyDueReminder deployed"
    else
        print_warning "sendNearlyDueReminder not found"
    fi
    
    if firebase functions:list | grep -q "sendOverdueAlert"; then
        print_success "sendOverdueAlert deployed"
    else
        print_warning "sendOverdueAlert not found"
    fi
    
    if firebase functions:list | grep -q "updateOverdueTasksStatus"; then
        print_success "updateOverdueTasksStatus deployed"
    else
        print_warning "updateOverdueTasksStatus not found"
    fi
    
    if firebase functions:list | grep -q "notify"; then
        print_success "notify HTTP endpoint deployed"
    else
        print_warning "notify endpoint not found"
    fi
    
    echo ""
}

# Test Cloud Functions
test_functions() {
    print_header "Step 9: Testing Functions"
    
    # Get the notify function URL
    NOTIFY_URL=$(firebase functions:list 2>/dev/null | grep -E "https://.*notify" | head -1 | awk '{print $NF}')
    
    if [ -z "$NOTIFY_URL" ]; then
        print_warning "Could not determine notify function URL"
        print_info "Manual test commands:"
        echo "  # Test nearly-due notifications"
        echo "  firebase functions:log --function=sendNearlyDueReminder"
        echo ""
        echo "  # View all logs"
        echo "  firebase functions:log --limit=50"
    else
        print_success "Notify function URL: $NOTIFY_URL"
        
        read -p "Run test endpoint? (y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Testing nearly-due notification..."
            RESPONSE=$(curl -s "$NOTIFY_URL?mode=nearly-due" 2>/dev/null || echo "curl failed")
            
            if echo "$RESPONSE" | grep -q "success"; then
                print_success "Test successful!"
                echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
            else
                print_warning "Test response received"
                echo "$RESPONSE"
            fi
        fi
    fi
    
    echo ""
}

# Error handler
trap 'print_error "An error occurred. Check the output above for details."' ERR

# Run main function
main "$@"
