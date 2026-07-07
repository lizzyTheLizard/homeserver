---
name: weather-forecast
description: This skill must be used when the user asks for a weather forecast, including today's weather, tomorrow's weather, or the weekly forecast. It handles the full flow from gathering location information to providing detailed weather information.
---

# Workflow

Check if you have the needed data from the previous conversation. If not:
- Use `get_detailed_weather` and `get_weather_forecast` to get the required information.
- If the user has not provided a location, use the current location.
- If the user has provided a location without coordinates, use `get_location_by_name` to fetch the coordinates.

If you have the needed data, use the template from DAILY.md or WEEKLY.md to provide the weather forecast to the user. If needed, you can also create a combination of both.

