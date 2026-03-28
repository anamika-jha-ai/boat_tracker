🚤 Ganga Boat Tracker

Ganga Boat Tracker is a web application that helps users easily find route-wise ferry timings across the Ganga River.
It is designed for students, working professionals, locals, and new commuters who rely on ferry services but face confusion due to changing schedules and high-tide pauses.

The platform simplifies ferry travel by highlighting the next available boat, showing high-tide pause timings, and visualizing ferry routes on an interactive map.

🏗️ System Architecture (Mermaid Diagram)
graph TD
    User[👤 User (Browser)]
    
    User -->|HTTP Requests| Frontend[🌐 Frontend (HTML, CSS, JS)]
    
    Frontend -->|API Calls| Backend[🖥️ Backend (Node.js + Express)]
    
    Backend -->|Ferry Schedule Data| Frontend
    
    Backend -->|Geo Route Data| MapService[🗺️ Leaflet + OpenStreetMap]
    
    MapService -->|Rendered Map & Routes| Frontend
    
    Frontend -->|UI Display| User

✨ Features

🔍 Route-wise ferry schedule lookup

⏭️ Highlights the next available boat

🌊 Shows high-tide pause timings

🗺️ Displays the selected ferry route on a map

📱 Responsive web interface

⚡ Lightweight and fast

🛠️ Tech Stack

Frontend

HTML

CSS

JavaScript

Backend

Node.js

Express.js

Maps

Leaflet.js

OpenStreetMap

Platform

Google Chromium Web Platform (browser-based app)


Visit the website:
https://anamika-jha-ai.github.io/boat_tracker/

🚀 How It Works

User selects a ferry route.

Frontend sends request to backend API.

Backend returns ferry schedule + tide pause data.

Leaflet renders the selected route on the map.

UI highlights the next available ferry.

🌱 Future Enhancements

Online Ticket ferry system

Real-time ferry tracking

Weather & tide API integration

Push notifications

Mobile app version

Multi-language support

🏷️ Tags
#GangaBoatTracker #NodeJS #ExpressJS #Leaflet #OpenStreetMap 
#SmartTransport #FerrySchedule #WebApp #StudentProject
#MermaidDiagram #SystemArchitecture #tech
