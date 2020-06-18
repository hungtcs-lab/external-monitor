#!/usr/bin/env node
import 'colors';
import os from 'os';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import isRunning from 'is-running';
import SerialPort from 'serialport';
import { fork } from 'child_process';
import { Command } from 'commander';

const PID_FILE_PATH = path.join(os.homedir(), '.config/external-monitor/pid');

async function isServiceRunning() {
  if(fs.existsSync(PID_FILE_PATH)) {
    if(isRunning(Number.parseInt(fs.readFileSync(PID_FILE_PATH, { encoding: 'ascii' })))) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

async function startService() {
  const ports = await SerialPort.list();

  if(ports.length < 1) {
    console.log(`没有可用的串口设备！`.yellow);
    process.exit(0);
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'port',
      message: '请选择串口号：',
      choices: ports.map(port => ({ name: port.path })),
    },
    {
      type: 'number',
      name: 'baudRate',
      default: 115200,
      message: '请输入串口波特率：'
    },
    {
      type: 'number',
      name: 'intervals',
      default: 1,
      message: '请输入数据刷新间隔（秒）：'
    },
  ]);

  const child = fork(path.join(__dirname, './worker.js'), [], {
    detached: true,
    stdio: 'ignore'
  });

  child.send(answers, (err) => {
    if(err) {
      console.error(err);
    }
  });

  child.on('message', message => {
    const { err } = message as any;
    if(err) {
      console.error(`启动失败: ${ err }`.red);
    } else {
      console.error(`启动成功！`.green);
      process.exit(0);
    }
  });

  child.unref();
}

(async function() {
  const program = new Command();

  program
    .command('status')
    .description('显示服务运行状态')
    .action(async () => {
      if(await isServiceRunning()) {
        console.log('external monitor is running'.green);
      } else {
        console.log('external monitor is not running'.red);
      }
      process.exit(0);
    });

  program
    .command('start')
    .description('启动服务')
    .action(async () => {
      if(await isServiceRunning()) {
        console.log('external monitor is running'.green);
      } else {
        await startService();
      }
    });

  program
    .command('stop')
    .description('停止服务')
    .action(async () => {
      if(await isServiceRunning()) {
        process.kill(Number.parseInt(fs.readFileSync(PID_FILE_PATH, { encoding: 'ascii' })));
      }
    });

  program.parse(process.argv);

}());
