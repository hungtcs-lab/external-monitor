#include <Wire.h>
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

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.fillScreen(SSD1306_BLACK);
  display.display();

  // display.setTextSize(2);
  // display.setCursor(0, 0);

  // display.println(F("CPU:"));

  // display.setCursor(0, 24);
  // display.println(F("24C"));

  // display.setCursor(64, 24);
  // display.println(F("152%"));

  // display.setCursor(0, 48);
  // display.println(F("3.2GHz"));

  // display.display();

}

void loop() {
  while (Serial.available() > 0) {
    char inChar = Serial.read();
    if (inChar == '\n') {
      String type = getValue(inString, '/', 0);
      if(type.equals("CPU")) {
        displayCPUInfo();
      }
      else if(type.equals("MEM")) {
        displayMEMInfo();
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
  display.setCursor(0, 24);
  display.println((percentage + "%").c_str());

  display.setCursor(0, 48);
  display.print(used.c_str());
  display.print(F("/"));
  display.print(total.c_str());

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
