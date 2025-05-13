# optiLoad

A demo “Uber-style” logistics platform for commercial trucking. Drivers can register, view and accept available shipments, update their load status, and get paid per mile automatically.

---
## NPM Start
## Open browser to http://localhost:8080
## Table of Contents

- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Prerequisites](#prerequisites)  
- [Installation](#installation)  
- [Environment Variables](#environment-variables)  
- [Usage](#usage)  
- [API Endpoints](#api-endpoints)  
- [Project Structure](#project-structure)  
- [Contributing](#contributing)  
- [License](#license)  

---

## Features

- User registration & login (Passport.js + sessions)  
- Randomized shipment offers based on vehicle capacity  
- Accept / decline offers seamlessly  
- In-transit tracking screen with “Mark as Delivered”  
- Automatic pay calculation (rate × distance) credited to driver balance  
- Fully responsive EJS views and modern CSS styling  

---

## Tech Stack

- **Frontend:** EJS templates, vanilla JavaScript, CSS  
- **Backend:** Node.js, Express.js, Passport.js, MongoDB (Mongoose)  
- **Authentication:** passport-local strategy  
- **Dev Tools:** nodemon, dotenv  

---

## Prerequisites

- Node.js v14+  
- npm or yarn  
- MongoDB database (Atlas or local)  

---

## Installation

```bash
# Clone the repo
git clone https://github.com/DvonteD23/optiLoad.git
cd optiLoad

# Install dependencies
npm install
# or
yarn install

