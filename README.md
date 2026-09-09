# 🏎️ NeonApexRacing

A fast-paced, neon-styled 3D browser racing game built using **ASP.NET Core MVC** on the backend and **Three.js / WebGL** on the frontend, featuring full 3D asset rendering and a persistent leaderboard system.

---

## 🌟 Features

- **3D Graphics & Models:** Real-time 3D racing powered by WebGL/Three.js with custom GLTF/GLB models (`player-car.glb`).
- **Responsive Controls:** Smooth client-side vehicle physics, steering mechanics, and track collision handling.
- **Persistent Leaderboard:** Track and display high scores and best lap times backed by SQL Server LocalDB.
- **Modern UI:** Synthwave/cyberpunk neon aesthetic powered by custom CSS and Bootstrap.
- **RESTful Game Endpoints:** ASP.NET Core controllers managing score submission and leaderboard retrieval.

---

## 🛠️ Tech Stack

- **Backend:** C# / ASP.NET Core MVC (.NET 8)
- **Database:** Microsoft SQL Server / LocalDB (Entity Framework Core)
- **Frontend:** JavaScript, Three.js, HTML5 Canvas, Bootstrap 5, CSS3
- **Asset Pipeline:** GLTF/GLB 3D assets

---

## 📂 Project Structure

```text
NeonApexRacing/
├── Controllers/
│   ├── GameController.cs         # Handles game sessions & score API
│   └── HomeController.cs         # Entry pages & navigation
├── Models/
│   └── Score.cs                  # Leaderboard entity model
├── Services/
│   ├── ILeaderboardService.cs    # Leaderboard abstraction
│   └── LeaderboardService.cs     # Leaderboard business logic
├── Views/
│   ├── Game/
│   │   ├── Index.cshtml          # 3D game canvas viewport
│   │   └── Leaderboard.cshtml    # High score tables
│   └── Shared/
│       └── _Layout.cshtml        # Main template
├── wwwroot/
│   ├── js/
│   │   └── game3d.js             # Core 3D engine and game loop
│   └── models/
│       └── player-car.glb        # 3D player vehicle model
└── appsettings.json              # Connection strings & logging
