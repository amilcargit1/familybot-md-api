const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    const city = String(
        req.query.city || req.query.q || ''
    ).trim();

    if (!city) {
        return res.status(400).json({
            status: false,
            message: 'Falta ?city=',
            example:
                '/api/tools/weather?apiKey=TU_KEY&city=Lima'
        });
    }

    try {
        // Buscar ciudad
        const geoUrl =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;

        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error(
                `Geocoding HTTP ${geoResponse.status}`
            );
        }

        const geo = await geoResponse.json();

        if (!geo.results || geo.results.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No se encontró la ciudad'
            });
        }

        const location = geo.results[0];

        // Obtener clima
        const weatherUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;

        const weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
            throw new Error(
                `Weather HTTP ${weatherResponse.status}`
            );
        }

        const weather = await weatherResponse.json();

        const current = weather.current || {};

        return res.json({
            status: true,
            result: {
                location: {
                    city: location.name,
                    country: location.country,
                    country_code: location.country_code,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timezone: location.timezone
                },
                weather: {
                    temperature: current.temperature_2m,
                    feels_like: current.apparent_temperature,
                    humidity: current.relative_humidity_2m,
                    precipitation: current.precipitation,
                    rain: current.rain,
                    wind_speed: current.wind_speed_10m,
                    weather_code: current.weather_code,
                    is_day: current.is_day
                },
                units: weather.current_units || {}
            }
        });

    } catch (error) {
        console.error('[WEATHER API]', error.message);

        return res.status(502).json({
            status: false,
            message: 'No se pudo obtener el clima'
        });
    }
});

router.meta = {
    title: 'Weather',
    description: 'Consulta el clima actual de una ciudad',
    icon: 'fas fa-cloud-sun',
    fields: [
        {
            name: 'city',
            label: 'Ciudad',
            placeholder: 'Lima'
        }
    ],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;