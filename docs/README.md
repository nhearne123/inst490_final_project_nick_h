---

## Developer Manual (Bottom Half)

### Audience
This section is intended for future developers who will take over this project.  
Readers are expected to have general knowledge of web applications, Node.js, REST APIs, and databases, but no prior knowledge of this specific system’s design.

---

## System Overview
This application is a full-stack web project consisting of:
- A Node.js + Express backend
- A static frontend served from the `/public` directory
- External data fetched from the Fruityvice API
- A Supabase database used to store user-selected favorite fruits

The backend acts as a proxy for Fruityvice to avoid CORS issues and exposes REST endpoints that the frontend consumes using the Fetch API.

---

## Installation & Dependencies

### Prerequisites
- Node.js (v18 or newer recommended)
- npm (included with Node.js)

### Install Dependencies
From the project root directory, run:

```bash
npm install
