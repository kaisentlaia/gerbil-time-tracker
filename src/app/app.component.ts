import { Component } from '@angular/core';
import { Task } from './task.model';
import { Observable, interval, Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'gerbil';
  private updateSubscription: Subscription;

  tasks: Task[];
  activeTask: Task;
  openTask: Task;
  newTask: string;
  date: Date;
  
  constructor(
    public electronService: ElectronService
  ) {
  }
  
  ngOnInit(): void {
    this.updateSubscription = interval(60000).subscribe(
      (val) => { 
        if(typeof(this.activeTask)!="undefined") {
          this.activeTask.end = null;
        }
      }
    );
    this.date = new Date();
    this.tasks = [];
  }

  beginTask(newTask) {
    if(typeof(newTask)!="undefined" && newTask && newTask!="") {
      console.log("beginning new task");
      console.log("isElectronApp",this.electronService.isElectronApp);
      if (this.electronService.isElectronApp) {
        console.log("sending message to REQUEST_CHANNEL");
        this.electronService.ipcRenderer.send('REQUEST_CHANNEL', 'my message');
      }
      let now = new Date();
      now.setDate(this.date.getDate());
      now.setMonth(this.date.getMonth());
      now.setFullYear(this.date.getFullYear());
      now.setSeconds(0);
      now.setMilliseconds(0);
      this.activeTask = {
        name: newTask,
        start: now,
        end: null
      } as Task;

      this.tasks.push(this.activeTask);
      this.newTask = null;
    }
  }

  switchTask(newTask) {
    if(typeof(newTask)!="undefined" && newTask && newTask!="") {
      if(typeof(this.activeTask)!="undefined") { this.endTask(); }
      this.beginTask(newTask);
    }
  }

  endTask() {
    let now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    this.tasks.find(x => x.name === this.activeTask.name && x.start === this.activeTask.start && x.end === this.activeTask.end ).end = now;
    this.activeTask = undefined;
  }

  editTask() {

  }

  getDurationString(task: Task) {
    if(typeof(task)!="undefined") {
      let end = new Date();
      if(task.end) {
        end = task.end;
      }
      let difference = end.getTime() - task.start.getTime();
      let hours = Math.floor((difference / (1000*60*60)) % 24);
      let minutes = Math.floor((difference / (1000*60)) % 60);
      if(hours<0) { hours = 0; }
      if(minutes<0) { minutes = 0; }
      return hours+"h "+minutes+"min";
    } else {
      return "";
    }
  }

  getDurationPill(task: Task) {
    if(typeof(task)!="undefined") {
      let end = new Date();
      if(task.end) {
        end = task.end;
      }
      let difference = end.getTime() - task.start.getTime();
      let hours = Math.floor((difference / (1000*60*60)) % 24);
      let minutes = Math.floor((difference / (1000*60)) % 60);
      if(hours<0) { hours = 0; }
      if(minutes<0) { minutes = 0; }
      return this.zeroPad(hours,2)+":"+this.zeroPad(minutes,2);
    } else {
      return "";
    }
  }

  getHours(task: Task) {
    if(typeof(task)!="undefined") {
      let end = new Date();
      if(task.end) {
        end = task.end;
      }
      let difference = end.getTime() - task.start.getTime();
      return ((difference / (1000*60*60)) % 24).toFixed(2);
    } else {
      return "";
    }
  }

  zeroPad(num, places) {
    let zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
  }
}
