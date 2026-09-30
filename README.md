# FieldCast

Whether Report Application

FieldCast is a regional weather map for agriculture. Choose a place, a 5 km or 10 km radius, a forecast date, and a local hour. Compare rain chance, temperature, cloud cover, and wind across 13 sampled points inside the selected circular region. The app uses Open-Meteo forecast data and OpenStreetMap tiles; it is not an agricultural advisory or a trained prediction model.

## Run locally

Requirements: Java 21 and an internet connection for the first build and live map data.

```powershell
.\mvnw.cmd spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080). No Maven install or API key is needed. Search a town, use browser location, click anywhere on the map, select a radius/date/hour, and inspect the neighboring weather layers. Changing the hour or map layer reuses the loaded daily forecast.

The weather endpoint is also available directly:

```text
GET /api/weather?latitude=28.6139&longitude=77.2090&radiusKm=5&date=2026-09-30
```

The API returns 13 points and 24 hourly readings for the selected date in one Open-Meteo API call. The radius must be 5 or 10 km; forecast dates are limited to the next seven days. Nearby-grid averages summarize the sampled points. Forecast resolution depends on the provider and does not guarantee field-level accuracy. This is forecast data, not observed radar imagery or a custom rain-prediction model.

## Learn by building

1. `FieldCastApplication` starts the Spring Boot application.
2. `WeatherController` exposes the HTTP API and validates coordinates.
3. `WeatherService` calls Open-Meteo and turns provider data into our response records.
4. `WeatherGrid` clips a 5 × 5 lattice to the selected radius; its geometry has focused tests.
5. `src/main/resources/static` is served by Spring Boot; its JavaScript calls our own API.

Suggested next milestones: add PostgreSQL and farmer-submitted field observations, store forecast snapshots with timestamps, then train and evaluate a separate model against later observed outcomes. Keep model predictions clearly separate from provider forecasts, and compare against a simple baseline before calling them useful.

## Tests

```powershell
.\mvnw.cmd test
```

## GitHub and deployment

Create an empty repository on GitHub, then run these commands from the `fieldcast` folder:

```powershell
git add .
git commit -m "Build FieldCast weather map"
git remote add origin https://github.com/<your-user>/fieldcast.git
git push -u origin main
```

The included GitHub Actions workflow runs the Maven verification build for pushes and pull requests to `main`. GitHub stores the source and runs CI; it does not host the Spring Boot server through GitHub Pages. To deploy the app, create a Render Blueprint from this repository and approve the service described in `render.yaml`. The Dockerfile builds and runs the app with Java 21.

Open-Meteo forecast/geocoding and OpenStreetMap tiles are external services. Their terms, attribution requirements, availability, and usage limits apply. Do not rely on this demo for safety-critical farm decisions.
