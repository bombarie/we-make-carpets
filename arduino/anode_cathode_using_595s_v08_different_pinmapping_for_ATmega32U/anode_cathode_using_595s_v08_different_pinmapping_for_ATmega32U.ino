/*
      __                                       ___                       
     /\ \                                     /\_ \                      
  ___\ \ \___      __      ___      __      __\//\ \     ___      __     
 /'___\ \  _ `\  /'__`\  /' _ `\  /'_ `\  /'__`\\ \ \   / __`\  /'_ `\   
/\ \__/\ \ \ \ \/\ \L\.\_/\ \/\ \/\ \L\ \/\  __/ \_\ \_/\ \L\ \/\ \L\ \  
\ \____\\ \_\ \_\ \__/.\_\ \_\ \_\ \____ \ \____\/\____\ \____/\ \____ \ 
 \/____/ \/_/\/_/\/__/\/_/\/_/\/_/\/___L\ \/____/\/____/\/___/  \/___L\ \
                                    /\____/                       /\____/
                                    \_/__/                        \_/__/ 
-- v08
  - adjust pinmappings for the data, latch and clock pins as those are placed 
    elsewhere on the ATmega32U4 (Also a difference between Leonardo and the Yun, mind you)
    - Adjusting the pinmapping turned out to be a fool's errand. Only got glitches so far. 
      Had to turn off SPI for now -> pinmapping is adjusted to work on non-SPI though.
      Time for another speedtest though:
        USE_SPI               false
        FAST_ANODE_SHIFTING   true
          20000 cycles in 2737348 micros
          20000 cycles in 2737892 micros
          20000 cycles in 2737888 micros
            refresh = 118 Hz (ouch)


-- v07
  - The approach to have both anodes and cathodes on an SPI train proved slower than
    the SPI + fast_anode solution so we're back to that. In the previous solution
    (in v05) I had the SPI speed to SPI_CLOCK_DIV4. Pumped up to SPI_CLOCK_DIV2 we
    now have a toasty 830hz refresh
    
  19 aug 2014 - 01:15 - testing speed of SPI at SPI_CLOCK_DIV2 and fast bitbanging
    USE_SPI               true (SPI speed: SPI_CLOCK_DIV2)
    FAST_ANODE_SHIFTING   true
      20000 cycles in 387804 micros
      20000 cycles in 388212 micros
      20000 cycles in 388220 micros
        refresh = 830 hz

-- v06
  - A test to see what speed/synchronisation improvements it yields to daisy chain
    the anode and cathode drivers to the SPI bus

  19 aug 2014 - 00:30 - testing speed of SPI'ing
    SPI at speed SPI_CLOCK_DIV4, all 13 shift registers being clocked
      20000 cycles in 726448 micros
      20000 cycles in 726868 micros
      20000 cycles in 726448 micros
        refresh = 443 hz

-- v05
  - Start actively using the Output Enable (OE) pin 13 on the 74HC595 shift register.
    Was experiencing ghosting while shifting from one column to he next, seems better
    to turn off the leds for the while that the new row is being shifted in.

-- v04

  - Further cleanup
    - Removing the native Arduino write methods
    - Reorganize how the preprocessor flags are used to show a cleaner loop() method

-- v03
  
  - Introduced SPI driving to the cathode rows. 
  - Clocking the anode columns fixed
  - Moved the pins from its PORTC positions onto PORTB where the SPI pins are.
  - Cleaned up a lot of the debug code
  - Made preprocessor switches for only including code that's relevant (this mainly pertains
     to USE_SPI)
  
  18 aug 2014 - 18:30 - comparative test between using SPI and the fast anode shifting
    USE_SPI               false
    FAST_ANODE_SHIFTING   false
      20000 cycles in 7188588 microseconds
      20000 cycles in 7189360 microseconds
      20000 cycles in 7189320 microseconds
        refresh = 45hz (ouch!)
    
    USE_SPI               false
    FAST_ANODE_SHIFTING   true
      20000 cycles in 2790960 microseconds
      20000 cycles in 2791556 microseconds
      20000 cycles in 2791560 microseconds
        refresh = 115hz
    
    USE_SPI               true (SPI speed: SPI_CLOCK_DIV4)
    FAST_ANODE_SHIFTING   true
      20000 cycles in 532804 microseconds
      20000 cycles in 532800 microseconds
      20000 cycles in 532800 microseconds
        refresh = 605hz

-- v02
  - Started toying with the method 'setColumn_faster()' which was an idea to cycle through
    the anode columns faster but didn't have it nailed down here yet (see v03 and up)

-- v01
  - New sketch name to step away from an earlier setup where the anodes were
    driven by HC74595 shift registers but the cathodes by the Adafruit TLC5947 driver
  - Comparative methods for setting values for anodes and cathodes, using either native
    Arduino ways like digitalWrite and shiftOut or my homebrew ones
  
*/

#include "SPI.h" // necessary library

//#define USE_SPI
#define FAST_ANODE_SHIFTING
//#define POOR_MANS_FADING
//#define CYCLE_ANODES_SLOWLY

// Anode shift register pins
#define cols_data   _BV(PORTD1) // direct name of digital pin 2
#define cols_latch  _BV(PORTD0) // direct name of digital pin 3
#define cols_clock  _BV(PORTD4) // direct name of digital pin 4

long prevClick;
int clickInterval = 100;
int brightnessDirection = 1;
int brightness = 0;
int brightnessInterval = 16;

byte currColumn = 0;
long prevColChange;
int changeColumnInterval = 300;

unsigned long whichColumn;     // used for shifting out the anode column high-bit

byte row_data[62][5];

long _before;
uint16_t counter = 0;

// this offset is so we don't accidentally send the number 10 or 13 (ascii LR and CR)
byte ledNumberOffset = 32; 

// some variables pertaining to an experimental poor-man's fading (called bit-angling)
byte skipNum = 0;
byte skipCounter = 0;
long prevSkipInterval;
uint16_t skipInterval = 35; // ms


#ifdef USE_SPI
  int ss = 10; // 10; // using digital pin 10 for SPI slave select
  int __mosi = 16; // 16 (according to the spec)
  int __sck = 15; // 10; // using digital pin 10 for SPI slave select
  #define SHIFT_REGISTER DDRB
  #define SHIFT_PORT PORTB
//  #define DATA               _BV(MOSI)         // direct name of MOSI (on ICSP header)
  #define DATA               _BV(PORTB2)         // direct name of MOSI (on ICSP header)
//  #define LATCH              _BV(PORTB0)     // direct name of digital pin 8 (SS))
  #define LATCH              _BV(PORTB6) // or PORTB6 for digital out 10       // direct name of digital pin 10 (SPI RCK)
//  #define CLOCK              _BV(SCK)          // direct name of SCK (on ICSP header)
  #define CLOCK              _BV(PORTB1)          // direct name of SCK (on ICSP header)
#else
  #define rows_data          _BV(PORTB4)        // digital pin 8  // instead of MOSI: digital pin 11
  #define rows_latch         _BV(PORTB5)        // digital pin 9  // instead of SS  : digital pin 10
  #define rows_clock         _BV(PORTB6)        // digital pin 10  // instead of SCK : digital pin 9
#endif
  #define cols_output_enable  _BV(PORTC6)       // direct name of digital pin 5
  #define rows_output_enable  _BV(PORTD7)       // direct name of digital pin 6

/*

  SETUP
  
*/

void setup() {
  Serial.begin(57600);  // serial monitor (to outside world)
  Serial1.begin(9600);  // internal Serial (to node.js)
  // while (!Serial) {} // wait for serial port to connect. Needed for Leonardo only

  //set PORTD pins as output (anode columns)
  DDRD |= cols_latch;    // output / high
  DDRD |= cols_clock;    // output / high
  DDRD |= cols_data;     // output / high

#ifdef USE_SPI
  // SPI stuff
  pinMode(ss, OUTPUT);                   // we use this for SS pin
  SPI.begin();                           // wake up the SPI bus.
  SPI.setClockDivider(SPI_CLOCK_DIV4);   // set to higher values (bigger divider) if covering larger distances
  SPI.setDataMode(SPI_MODE0);            // think SPI_MODE0 is the default. What's the advantage of the others?
  SPI.setBitOrder(MSBFIRST);             // the order in which bits are sent
#else
  //set PORTB pins as output (cathode rows)
  DDRB |= rows_latch;    // output / high
  DDRB |= rows_clock;    // output / high
  DDRB |= rows_data;     // output / high
#endif
  DDRD |= rows_output_enable;     // set pin as output
  PORTD &= ~rows_output_enable;   // turn low (means lights on)
  DDRC |= cols_output_enable;     // set pin as output
  PORTC &= ~cols_output_enable;   // turn low (means lights on)

  // DEBUG variables for doing time-based actions
  prevClick = millis();
  prevColChange = millis();
  _before = micros();


  // set all the row_data  
  for (byte col = 0; col < 62; col++) {
    for (byte rowByte = 0; rowByte < 5; rowByte++) {
      if (col % 2 == 0) {
        row_data[col][rowByte] = B01010101;
      } else {
        row_data[col][rowByte] = B10101010;
      }
      
      // override
      row_data[col][rowByte] = B1111110;
    }
  }
  
  // turn on the leds in the corners
  turnOn(0, 0);   // corner
  turnOn(13, 0);  // corner
  turnOn(13, 13); // corner
  turnOn(0, 13);  // corner

  prevSkipInterval = millis();
}




/*

  LOOP
  
*/

void loop() {
  Serial1Reading();
  /*
  // Serial for external connection
  if (Serial.available() > 0) {
    byte in = Serial.read() - ledNumberOffset; // ascii 48 = 0, ascii 49 = 1, etc.
    if (in == 223) { // turn on
      byte _col = Serial.read() - ledNumberOffset;
      byte _row = Serial.read() - ledNumberOffset;
      turnOn(_col, _row);
      skipNum = 8; // used for a poor-man's fading effect (*if* we're using that..)
      Serial.print("led on: ["); Serial.print(_col); Serial.print(","); Serial.print(_row); Serial.println("]");
    }
    if (in == 222) { // turn off
      byte _col = Serial.read() - ledNumberOffset;
      byte _row = Serial.read() - ledNumberOffset;
      turnOff(_col, _row);
      skipNum = 8; // used for a poor-man's fading effect (*if* we're using that..)
      Serial.print("led off: ["); Serial.print(_col); Serial.print(","); Serial.print(_row); Serial.println("]");
    }

    // If bytes in the Serial pipe, flush 'em out
    while(Serial.available() > 0) Serial.read();
  }

  // Serial1 for internal connection (ie from node.js on Yun)
  // TODO -> This triggers for every byte!! So with 3 bytes it triggers three times. Bad Serial1!
  //         So, todo: make a smarter parser that builds up the message bit by bit and parses/executes it when complete
  if (Serial1.available() > 2) {
    Serial.print("size of serial: "); Serial.println(Serial1.available());
    
    byte in = Serial1.read();
    Serial.print("in: "); Serial.println(in);
    in -= ledNumberOffset; // ascii 48 = 0, ascii 49 = 1, etc.
    if (in == 223) { // turn on
      byte _col = Serial1.read() - ledNumberOffset;
      byte _row = Serial1.read() - ledNumberOffset;
      turnOn(_col, _row);
      skipNum = 8; // used for a poor-man's fading effect (*if* we're using that..)
//      Serial1.print("led on: ["); Serial1.print(_col); Serial1.print(","); Serial1.print(_row); Serial1.println("]");
    }
    if (in == 222) { // turn off
      byte _col = Serial1.read() - ledNumberOffset;
      byte _row = Serial1.read() - ledNumberOffset;
      turnOff(_col, _row);
      skipNum = 8; // used for a poor-man's fading effect (*if* we're using that..)
//      Serial1.print("led off: ["); Serial1.print(_col); Serial1.print(","); Serial1.print(_row); Serial1.println("]");
    }

    // If bytes in the Serial pipe, flush 'em out
    while(Serial1.available() > 0) Serial1.read();
  }
  //*/

#ifdef CYCLE_ANODES_SLOWLY
  // DEBUG
  //  Cycle through the anode columns slower. Sometimes handy to better see what the code is doing
  if (millis() - prevClick > clickInterval) {
    currColumn++;                            // increase column
    if (currColumn > 13) currColumn = 0;     // if at column 14, reset to 0 (just for debugging)

    PORTC |= cols_output_enable;             // turn high (means lights off)
    PORTD |= rows_output_enable;        // turn high (means lights off)

    setRow(currColumn);                 // drive cathode rows

    setColumn(currColumn);              // drive anode columns

    PORTC &= ~cols_output_enable;            // turn low (means lights on)
    PORTD &= ~rows_output_enable;       // turn low (means lights on)

    prevClick = millis();
  }
#else
  currColumn++;                            // increase column
  if (currColumn > 61) currColumn = 0;     // if at column 62, reset to 0

  /*
    NOTES
    - Met beide OE uit/aan zetten, mooiste beeld bij eerst anode en daarna cathode.
      Levert wel VEEL lichtverlies op
    
  */  

#ifdef POOR_MANS_FADING
  if (skipNum > 0) {
    skipCounter++;
  }
  if (skipCounter >= skipNum) {

    setRow(currColumn);                       // drive cathode rows
    PORTD |= rows_output_enable;              // CATHODE  turn high (means lights off)
    setColumn(currColumn);                    // drive anode columns
    PORTD &= ~rows_output_enable;             // CATHODE  turn low (means lights on)
    
    skipCounter = 0;
  }
#else

  setRow(currColumn);                       // drive cathode rows

//  PORTC |= cols_output_enable;            // ANODE turn high (means lights off)
  PORTD |= rows_output_enable;              // CATHODE  turn high (means lights off)

  setColumn(currColumn);                    // drive anode columns

//  PORTC &= ~cols_output_enable;           // ANODE turn low (means lights on)
  PORTD &= ~rows_output_enable;             // CATHODE  turn low (means lights on)

#endif

#endif


  /*
  currColumn++;                            // increase column
  if (currColumn > 61) currColumn = 0;     // if at column 62, reset to 0
  setColumn(currColumn);                   // drive anode columns
  setRow(currColumn);                      // drive cathode rows
  //*/

  //*
  //*/

  /*
  // DEBUG
  //  A way to measure performance.
  //  Counts how long it takes to cycle 20000 times.
  counter++;
  if (counter > 20000) {
    long _after = micros() - _before;
    _before = micros();
    Serial.print("20000 cycles in "); Serial.print(_after); Serial.println(" micros");
    counter = 0;
  }
  //*/
  
#ifdef POOR_MANS_FADING
  if (millis() - prevSkipInterval > skipInterval) {
    if (skipNum > 0) skipNum--;
    
    prevSkipInterval = millis();
  }
#endif

}


void Serial1Reading() {
  // Serial1 for internal connection (ie from node.js on Yun)
  // TODO -> This triggers for every byte!! So with 3 bytes it triggers three times. Bad Serial1!
  //         So, todo: make a smarter parser that builds up the message bit by bit and parses/executes it when complete
  if (Serial1.available() > 2) {
//    Serial.print("size of serial: "); Serial.println(Serial1.available());
    
    byte in = Serial1.read();
//    Serial.print("in: "); Serial.println(in);
//    in -= ledNumberOffset; // ascii 48 = 0, ascii 49 = 1, etc.
    if (in == 255) { // turn on
      byte _col = Serial1.read() - ledNumberOffset;
      byte _row = Serial1.read() - ledNumberOffset;
      
      // DEBUG
      blinkInterval = (_col * 20) + 50;
      
      turnOn(_col, _row);
//      Serial1.print("led on: ["); Serial1.print(_col); Serial1.print(","); Serial1.print(_row); Serial1.println("]");
    }
    if (in == 254) { // turn off
      byte _col = Serial1.read() - ledNumberOffset;
      byte _row = Serial1.read() - ledNumberOffset;
      turnOff(_col, _row);
//      Serial1.print("led off: ["); Serial1.print(_col); Serial1.print(","); Serial1.print(_row); Serial1.println("]");
    }

    if (in == 253) { // turn all on
      blinkInterval = 25;
    }
    if (in == 252) { // turn all off
      blinkInterval = 500;
    }

    // If bytes in the Serial pipe, flush 'em out
    while(Serial1.available() > 0) Serial1.read();
  }
}

/*

  TURN SINGLE LED ON OR OFF

*/
void turnOn(byte _col, byte _row) {
  byte rowArrayPos = floor(_row/8);
  row_data[_col][rowArrayPos] |= _BV(_row % 8);
//  if (_row < 8) {
//    row_data[_col][0] |= _BV(_row);
//  } else {
//    row_data[_col][1] |= _BV(_row);
//  }
}

void turnOff(byte _col, byte _row) {
  byte rowArrayPos = floor(_row/8);
  row_data[_col][rowArrayPos] &= ~_BV(_row % 8);
//  if (_row < 8) {
//    row_data[_col][0] &= ~_BV(_row);
//  } else {
//    row_data[_col][1] &= ~_BV(_row);
//  }
}




/*

  SET ANODE COLUMN
  
*/

#ifdef FAST_ANODE_SHIFTING
void setColumn(byte c) {
  PORTD &= ~cols_latch;      // latch low
  
  // If at first position shift out a 0, otherwise a 1 (this is inverted logic since I'm using PNP transistors
  // and driving a PNP high means no current and vice versa
  if (c == 0) {
    PORTD &= ~cols_data;     // data 0 (which becomes a high output because I'm using PNP transistors
  } else {
    PORTD |= cols_data;      // data 1 (which becomes a low output because I'm using PNP transistors
  }
  
  PORTD |= cols_clock;       // clock high
  PORTD &= ~cols_clock;      // clock low

  PORTD |= cols_latch;       // latch high
}
#else
void setColumn(byte c) {
  PORTD &= ~cols_latch;      // latch low

  whichColumn = _BV(c);

  // wonder if this shifting method is as efficient as it could be..
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >> 96) & 0xFF));   // columns 56-62
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >> 80) & 0xFF));   // columns 48-55
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >> 64) & 0xFF));   // columns 40-47
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >> 32) & 0xFF));   // columns 32-38
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >> 24) & 0xFF));   // columns 24-31
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >> 16) & 0xFF));   // columns 16-23
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~((whichColumn >>  8) & 0xFF));   // columns 08-15
  myShiftOutCols_fast(cols_data, cols_clock, MSBFIRST, ~(whichColumn & 0xFF));           // columns 00-07
  
  PORTD |= cols_latch;       // latch high
}
#endif




/*

  SET CATHODE ROW
  
*/

#ifdef USE_SPI
void setRow(byte col) {
  PORTB &= ~LATCH; // PORTB2 / SPI SS low

  // SPI.transfer(0); // send command byte <-- WHAT'S THIS REALLY FOR???
  SPI.transfer(~row_data[col][4]);  // send value (0~255), rows 32-39
  SPI.transfer(~row_data[col][3]);  // send value (0~255), rows 24-31
  SPI.transfer(~row_data[col][2]);  // send value (0~255), rows 16-23
  SPI.transfer(~row_data[col][1]);  // send value (0~255), rows 08-15
  SPI.transfer(~row_data[col][0]);  // send value (0~255), rows 00-07

  PORTB |= LATCH; // PORTB2 / SPI SS high
}
#else
void setRow(byte col) {
  PORTB &= ~rows_latch;   // latch low

  //*
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, ~row_data[col][4]);  // rows 32-39
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, ~row_data[col][3]);  // rows 24-31
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, ~row_data[col][2]);  // rows 16-23
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, ~row_data[col][1]);  // rows 08-15
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, ~row_data[col][0]);  // rows 00-07
  //*/
  /*
  byte b = ~B10101010;
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, b);  // rows 32-39
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, b);  // rows 24-31
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, b);  // rows 16-23
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, b);  // rows 08-15
  myShiftOutRows_fast(rows_data, rows_clock, MSBFIRST, b);  // rows 00-07
  //*/

  PORTB |= rows_latch;    // latch high
}
#endif






/*

  CUSTOM (FAST) COLUMNS SHIFT OUT
  
*/
void myShiftOutCols_fast(uint8_t _dataPin, uint8_t _clockPin, uint8_t bitOrder, uint8_t val) {
  uint8_t i;

  for (i = 0; i < 8; i++)  {
    if (bitOrder == LSBFIRST) {
      if (!!(val & (1 << i))) {
        PORTD |= _dataPin;    // data 1
      } else {
        PORTD &= ~_dataPin;    // data 0
      }
    } else {
      if (!!(val & (1 << (7 - i)))) {
        PORTD |= _dataPin;    // data 1
      } else {
        PORTD &= ~_dataPin;    // data 0
      }
    }

    PORTD |= _clockPin;    // clock high
    PORTD &= ~_clockPin;   // clock low
  }
}





/*

  CUSTOM (FAST) ROWS SHIFT OUT
  
*/

void myShiftOutRows_fast(uint8_t _dataPin, uint8_t _clockPin, uint8_t bitOrder, uint8_t val) {
  uint8_t i;

  for (i = 0; i < 8; i++)  {
    if (bitOrder == LSBFIRST) {
      if (!!(val & (1 << i))) {
        PORTB |= _dataPin;    // data 1
      } else {
        PORTB &= ~_dataPin;    // data 0
      }
    } else {
      if (!!(val & (1 << (7 - i)))) {
        PORTB |= _dataPin;    // data 1
      } else {
        PORTB &= ~_dataPin;    // data 0
      }
    }

    PORTB |= _clockPin;    // clock high
    PORTB &= ~_clockPin;   // clock low
  }
}



