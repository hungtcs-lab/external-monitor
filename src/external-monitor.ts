import SerialPort from 'serialport';
import systeminformation from 'systeminformation';
import { mergeMap, map, catchError, tap } from 'rxjs/operators';
import { from, bindCallback, empty, timer } from 'rxjs';

const serial = new SerialPort('/dev/ttyUSB0', { autoOpen: true, baudRate: 115200 }, err => {
  console.log(err);
});

serial.pipe(new SerialPort.parsers.Readline({ delimiter: '\n', encoding: 'ascii' }))

serial.on('data', line => console.log(`> ${line}`));

timer(0, 2000)
  .pipe(mergeMap(count => {
    switch(count % 2) {
      case 0: {
        return sendCPUInfo();
      }
      case 1: {
        return sendMEMInfo();
      }
      case 2: {
        return sendDiskInfo();
      }
      default: {
        return sendCPUInfo();
      }
    }
  }))
  .pipe(catchError(err => {
    console.error(err);
    return empty();
  }))
  .subscribe();


function sendCPUInfo() {
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
    .pipe(mergeMap(({ temperature, load, speed }) => bindCallback(serial.write.bind(serial))(`CPU/${ temperature }/${ speed.toFixed(1) }/${ load.toFixed(1) }\n`)))
}

function sendMEMInfo() {
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

function sendDiskInfo() {
  return from(systeminformation.fsSize())
    .pipe(map(fsSize => {
      return fsSize.map(item => ({
        size: item.size,
        percentage: item.use,
        mount: item.mount,
        fs: item.fs,
      }))
    }))
    .pipe(tap(a => console.log(a)))
    // .pipe(mergeMap(({ size, percentage }) => bindCallback(serial.write.bind(serial))(`MEM/${ total.toFixed(1) }/${ active.toFixed(1) }/${ percentage.toFixed(1) }\n`)));
}
