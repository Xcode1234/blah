#!/bin/bash

#######################################
# Velvet Vogue - PHP Setup Script
# Automated database and PHP server setup
#######################################

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Velvet Vogue - PHP Backend Setup     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Check PHP installation
echo -e "${BLUE}[1/5]${NC} Checking PHP installation..."
if ! command -v php &> /dev/null; then
    echo -e "${RED}✗ PHP is not installed${NC}"
    echo "Install PHP with: sudo apt install php php-mysql php-cli"
    exit 1
fi
PHP_VERSION=$(php -v | head -n 1)
echo -e "${GREEN}✓ PHP installed: $PHP_VERSION${NC}\n"

# Check MySQL installation
echo -e "${BLUE}[2/5]${NC} Checking MySQL installation..."
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}✗ MySQL is not installed${NC}"
    echo "Install MySQL with: sudo apt install mysql-server"
    exit 1
fi
echo -e "${GREEN}✓ MySQL found${NC}\n"

# Create logs directory
echo -e "${BLUE}[3/5]${NC} Setting up directories..."
mkdir -p logs
# some environments may restrict changing perms; ignore failures
chmod 777 logs 2>/dev/null || true
mkdir -p assets/images
chmod 777 assets/images 2>/dev/null || true
echo -e "${GREEN}✓ Directories created${NC}\n"

# Database setup
echo -e "${BLUE}[4/5]${NC} Setting up database..."

# Check for config.php
if [ ! -f "includes/config.php" ]; then
    echo -e "${RED}✗ includes/config.php not found${NC}"
    exit 1
fi

# Attempt to create database from SQL file using several methods
if [ ! -f "database.sql" ]; then
    echo -e "${RED}✗ database.sql not found${NC}"
    exit 1
fi

echo "Creating database..."

# Try to read DB credentials from includes/config.php if present
# database credentials - only velvetvogue user is permitted
DB_USER="velvetvogue"
DB_PASS=""  # leave blank; the script will prompt or use config.php if provided
if [ -f "includes/config.php" ]; then
    DB_USER=$(grep "define('DB_USER'" includes/config.php | head -n1 | sed -E "s/.*'DB_USER',[[:space:]]*'([^']+)'.*/\1/") || DB_USER=""
    DB_PASS=$(grep "define('DB_PASS'" includes/config.php | head -n1 | sed -E "s/.*'DB_PASS',[[:space:]]*'([^']+)'.*/\1/") || DB_PASS=""
fi

# Helper to run mariadb command and return status
run_mysql() {
    local cmd="$1"
    if eval "$cmd" 2>/dev/null; then
        return 0
    fi
    return 1
}

CREATED=1

# 1) Try using DB_USER/DB_PASS from config (if DB_USER present)
if [ -n "$DB_USER" ]; then
    echo "- Trying credentials from includes/config.php (user: $DB_USER)"
    if [ -n "$DB_PASS" ]; then
        if run_mysql "mariadb -u $DB_USER -p\"$DB_PASS\" < database.sql"; then
            CREATED=0
        elif run_mysql "mysql -u $DB_USER -p\"$DB_PASS\" < database.sql"; then
            CREATED=0
        fi
    else
        if run_mysql "mariadb -u $DB_USER < database.sql"; then
            CREATED=0
        elif run_mysql "mysql -u $DB_USER < database.sql"; then
            CREATED=0
        fi
    fi
fi

# 2) Try root without password
if [ $CREATED -ne 0 ]; then
    echo "- Trying mariadb as root (no password)"
    if run_mysql "mariadb -u root < database.sql"; then
        CREATED=0
    elif run_mysql "mysql -u root < database.sql"; then
        CREATED=0
    fi
fi

# 3) Try using sudo mariadb (some systems require sudo)
if [ $CREATED -ne 0 ]; then
    echo "- Trying sudo mariadb (system MariaDB root)"
    if run_mysql "sudo mariadb < database.sql"; then
        CREATED=0
    elif run_mysql "sudo mysql < database.sql"; then
        CREATED=0
    fi
fi

# 4) Prompt for root password and try
if [ $CREATED -ne 0 ]; then
    read -s -p "MariaDB root password (leave empty to skip): " PROMPT_PASS
    echo
    if [ -n "$PROMPT_PASS" ]; then
        echo "- Trying mariadb with provided root password"
        if run_mysql "mariadb -u root -p\"$PROMPT_PASS\" < database.sql"; then
            CREATED=0
        elif run_mysql "mysql -u root -p\"$PROMPT_PASS\" < database.sql"; then
            CREATED=0
        fi
    fi
fi

if [ $CREATED -eq 0 ]; then
    echo -e "${GREEN}✓ Database created successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to create database using automated methods${NC}"
    echo "Manual steps you can try:" 
    echo "  1) Run: mariadb -u root < database.sql" 
    echo "  2) Or: mysql -u root < database.sql" 
    echo "  3) If root has password: mariadb -u root -p < database.sql" 
    echo "  4) Use sudo if your system requires it: sudo mariadb < database.sql" 
    echo "  5) Verify credentials in includes/config.php and try those user/pass combinations"
    exit 1
fi

# Start PHP server
echo -e "${BLUE}[5/5]${NC} Starting PHP server..."
PORT=8000

# Check if port is available
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Port $PORT is already in use${NC}"
    echo "Use: php -S localhost:8001"
    exit 1
fi

echo -e "${GREEN}✓ Setup complete!${NC}\n"

echo -e "${BLUE}Starting PHP server on port $PORT...${NC}"
echo -e "${GREEN}Access the site at: http://localhost:$PORT${NC}\n"

# Start the server
php -S localhost:$PORT

