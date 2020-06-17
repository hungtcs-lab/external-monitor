import fs from 'fs';
import os from 'os';
import path from 'path';
import SerialPort from "serialport";
import systeminformation from 'systeminformation';
import { mergeMap, map, catchError } from "rxjs/operators";
import { timer, from, bindCallback, empty } from "rxjs";

const configDir = path.join(os.homedir(), '.config/external-monitor');
if(!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
fs.writeFileSync(path.join(configDir, 'pid'), `${ process.pid }`, { encoding: 'ascii' });

process.on('message', (answers) => {

  const serial = new SerialPort(answers.port, { autoOpen: true, baudRate: answers.baudRate }, err => {
    if(err) {
      console.error(`Error: `, err);
      process.send?.({ err: err.message });
      process.exit(1);
    } else {
      process.send?.({ err: null });
    }
  });
  serial.pipe(new SerialPort.parsers.Readline({ delimiter: '\n', encoding: 'ascii' }))
  serial.on('data', line => console.log(`> ${line}`));

  timer(0, answers.intervals * 1000)
    .pipe(mergeMap(count => {
      return sendMEMInfo(serial);
    }))
    .pipe(catchError(err => {
      console.error(`Error: `, err);
      return empty();
    }))
    .subscribe();


  function sendCPUInfo(serial: SerialPort) {
    return from(systeminformation.cpuTemperature())
      .pipe(map(temperature => temperature.main))
      .pipe(mergeMap((temperature) => {
        return from(systeminformation.cpuCurrentspeed())
          .pipe(map(cpuCurrentspeed => cpuCurrentspeed.avg))
          .pipe(map((speed) => ({ speed, temperature })));
      }))
      .pipe(mergeMap((data) => {
        return from(systeminformation.currentLoad())
          .pipe(map(currentLoad => currentLoad.currentload))
          .pipe(map(load => ({ ...data, load })))
      }))
      .pipe(mergeMap(({ temperature, load, speed }) => bindCallback(serial.write.bind(serial))(`CPU/${ temperature }/${ speed.toFixed(1) }/${ load.toFixed(1) }\n`)));
  }

  function sendMEMInfo(serial: SerialPort) {
    return from(systeminformation.mem())
      .pipe(map(mem => {
        return {
          total: mem.total,
          active: mem.active,
        };
      }))
      .pipe(map(({ total, active }) => ({
        total: total/1024/1024/1024,
        active: active/1024/1024/1024,
        percentage: (active *100 / total)
      })))
      .pipe(mergeMap(({ total, active, percentage }) => bindCallback(serial.write.bind(serial))(`MEM/${ total.toFixed(1) }/${ active.toFixed(1) }/${ percentage.toFixed(1) }\n`)));
  }

});
