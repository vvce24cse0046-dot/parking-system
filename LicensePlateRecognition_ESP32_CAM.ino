/*
 * ESP32-CAM Vehicle Number Plate Recognition
 * 
 * Overview:
 * This project uses the ESP32-CAM to capture an image of a vehicle's number plate 
 * and sends it to the Circuit Digest cloud server for recognition. The server 
 * processes the image using machine learning models and returns the recognized 
 * number plate data. The result is displayed on an OLED screen connected to the ESP32-CAM.
 *
 * Features:
 * - Captures an image using the ESP32-CAM.
 * - Sends the captured image to a cloud server via a secure HTTPS connection.
 * - Receives and displays the recognized number plate data.
 * - Uses an OLED display to show status messages and results.
 * - Supports any device with a camera and internet access using the API.
 * 
 * Components Required:
 * - ESP32-CAM Module
 * - OLED Display (SSD1306)
 * - Push Button (Trigger button)
 * - Flashlight (LED)
 *
 * Note:
 * Ensure that the ESP32-CAM is correctly wired, including the I2C pins for the OLED display.
 */
// This code captures an image using the ESP32-CAM and sends it to a server for processing.
// The captured image is uploaded securely via HTTPS, and the response from the server 
// is processed to extract specific information like number plate recognition data.

// Libraries for WiFi, Secure Client, and Camera functionalities
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "esp_camera.h"

/* Configuration --------------------------------------------------------- */
const char* ssid = "Prateeksha";         // Replace with your WiFi SSID
const char* password = "peku1234";      // Replace with your WiFi Password
String serverName = "www.circuitdigest.cloud"; 
String serverPath = "/api/v1/readnumberplate"; 
const int serverPort = 443; 
String apiKey = "cd_vvc_020226_WpVByu";             // Replace with your API key

WiFiClientSecure client;

// Camera GPIO pins for standard ESP32-CAM (AI-Thinker)
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

String extractJsonStringValue(const String& jsonString, const String& key) {
  int keyIndex = jsonString.indexOf(key);
  if (keyIndex == -1) return "";
  int startIndex = jsonString.indexOf(':', keyIndex) + 2;
  int endIndex = jsonString.indexOf('"', startIndex);
  if (startIndex == -1 || endIndex == -1) return "";
  return jsonString.substring(startIndex, endIndex);
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi Connected. IP: " + WiFi.localIP().toString());

  // Configure camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_CIF;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x", err);
    ESP.restart();
  }

  // Trigger one photo immediately on boot
  sendPhoto();
}

void loop() {
  // You can add a timer here to take photos periodically
  // For now, it just sits idle after the setup photo
}

int sendPhoto() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return -1;
  }

  Serial.println("Connecting to: " + serverName);
  client.setInsecure(); 

  if (client.connect(serverName.c_str(), serverPort)) {
    Serial.println("Connection successful! Uploading...");

    String filename = apiKey + ".jpeg";
    String head = "--Boundary\r\nContent-Disposition: form-data; name=\"imageFile\"; filename=\"" + filename + "\"\r\nContent-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--Boundary--\r\n";
    uint32_t totalLen = fb->len + head.length() + tail.length();

    client.println("POST " + serverPath + " HTTP/1.1");
    client.println("Host: " + serverName);
    client.println("Content-Length: " + String(totalLen));
    client.println("Content-Type: multipart/form-data; boundary=Boundary");
    client.println("Authorization:" + apiKey);
    client.println();
    client.print(head);

    uint8_t* fbBuf = fb->buf;
    size_t fbLen = fb->len;
    for (size_t n = 0; n < fbLen; n += 1024) {
      size_t chunk = (n + 1024 < fbLen) ? 1024 : (fbLen - n);
      client.write(fbBuf + n, chunk);
    }

    client.print(tail);
    esp_camera_fb_return(fb);

    // Wait for response
    String response;
    long startTime = millis();
    while (client.connected() && millis() - startTime < 5000) {
      if (client.available()) {
        char c = client.read();
        response += c;
      }
    }

    String NPRData = extractJsonStringValue(response, "\"number_plate\"");
    Serial.println("Full Response: " + response);
    Serial.println("DETECTION RESULT: " + NPRData);

    client.stop();
    return 0;
  } else {
    Serial.println("Server connection failed");
    esp_camera_fb_return(fb);
    return -2;
  }
}