#include <Wire.h>
#include <avr/wdt.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Fonts/FreeSerif9pt7b.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_RESET     4
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

String inString = "";

void setup() {
  Serial.begin(115200);

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }

  display.fillScreen(SSD1306_BLACK);
  display.display();

  display.setTextColor(SSD1306_WHITE);

  wdt_enable(WDTO_2S);
}

void loop() {
  while (Serial.available() > 0) {
    char inChar = Serial.read();
    if (inChar == '\n') {
      wdt_reset();
      String type = getValue(inString, '/', 0);
      if(type.equals("CPU")) {
        displayCPUInfo();
      }
      else if(type.equals("MEM")) {
        displayMEMInfo();
      }
      else if(type.equals("NET")) {
        displayNETInfo();
      }
      inString = "";
    } else {
      inString += inChar;
    }
  }
}

void displayCPUInfo() {
  Serial.print(inString);
  String temperature = getValue(inString, '/', 1);
  String speed = getValue(inString, '/', 2);
  String load = getValue(inString, '/', 3);

  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);

  display.println(F("CPU:"));
  display.setCursor(0, 24);
  display.println((temperature + "C").c_str());

  display.setCursor(64, 24);
  display.println((load + "%").c_str());

  display.setCursor(0, 48);
  display.println((speed + "GHz").c_str());

  display.display();
}

void displayMEMInfo() {
  Serial.print(inString);
  String total = getValue(inString, '/', 1);
  String used = getValue(inString, '/', 2);
  String percentage = getValue(inString, '/', 3);

  display.clearDisplay();

  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println(F("MEM:"));

  drawStringAlignRight((percentage + "%").c_str(), 128, 0);

  unsigned char value = ((unsigned char)(126 * percentage.toFloat() / 100));
  display.fillRoundRect(0, 25, 128, 14, 3, SSD1306_WHITE);

  display.fillRoundRect(128 - value - 1, 26, value, 12, 3, SSD1306_BLACK);

  drawStringAlignRight((used + "/" + total).c_str(), 128, 48);

  display.display();
}

void displayNETInfo() {
  Serial.print(inString);
  String iface = getValue(inString, '/', 1);
  String upload = getValue(inString, '/', 2);
  String downlaod = getValue(inString, '/', 3);

  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);

  display.println(F("NET:"));

  display.setCursor(128, 0);
  drawStringAlignRight(iface.c_str(), 128, 0);

  display.setCursor(0, 24);
  display.println(F("U:"));
  drawStringAlignRight(upload.c_str(), 128, 24);

  display.setCursor(0, 48);
  display.println(F("D:"));
  drawStringAlignRight(downlaod.c_str(), 128, 48);

  display.display();
}

String getValue(String data, char separator, int index) {
  int found = 0;
  int strIndex[] = { 0, -1 };
  int maxIndex = data.length()-1;
  for(int i=0; i<=maxIndex && found<=index; i++){
    if(data.charAt(i)==separator || i==maxIndex){
      found++;
      strIndex[0] = strIndex[1]+1;
      strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  return found>index ? data.substring(strIndex[0], strIndex[1]) : "";
}

void drawStringAlignRight(const char *buf, int x, int y) {
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(buf, x, y, &x1, &y1, &w, &h);
    display.setCursor(x - w, y);
    display.print(buf);
}
