const int RED_LED = 2;

void setup() {
  // put your setup code here, to run once:
  pinMode(RED_LED, OUTPUT);
  Serial.begin(115200);
  while(!Serial) { ; }
  
  Serial.println("Pronto psara escutar os comandos");
  digitalWrite(RED_LED, HIGH);
  delay(1000);
  digitalWrite(RED_LED, LOW);
  delay(1000);
  digitalWrite(RED_LED, HIGH);
  delay(1000);
  digitalWrite(RED_LED, LOW);
}

String buf;
void loop() {
  // put your main code here, to run repeatedly:
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      buf.trim();

      if (buf.equalsIgnoreCase("ON")) {
        digitalWrite(RED_LED, HIGH);
      } else if (buf.equalsIgnoreCase("OFF")) {
        digitalWrite(RED_LED, LOW);
      } else if (buf.length()) {
        Serial.print("Comando desconhecido: ");
        Serial.print(buf);
      }

      // Serial.print("Recebido:");
      // Serial.print(buf);
      buf = "";
    } else { 
      buf += c;
    }

  }
  
}
