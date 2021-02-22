import { Component, AfterViewInit, NgZone } from '@angular/core';
import { Task } from './task.model';
import { Observable, interval, Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'gerbil';
  private updateSubscription: Subscription;

  tasks: Task[];
  todayTasks: Task[];
  activeTask: Task;
  selectedTask: Task;
  openTask: any;
  newTask: string;
  selectedDate: Date;
  totals: any[];
  totalHours: any;

  constructor(
    public electronService: ElectronService,
    readonly ngZone: NgZone
  ) {
  }

  ngOnInit(): void {
    this.updateSubscription = interval(60000).subscribe(
      (val) => {
        if (typeof(this.activeTask) !== 'undefined' ) {
          this.activeTask.end = null;
          this.updateTotals();
        }
      }
    );
  }

  ngAfterViewInit() {
    // console.log('this.electronService.isElectronApp', this.electronService.isElectronApp);
    if (this.electronService.isElectronApp) {
      // console.log('electron app');
      this.electronService.ipcRenderer.send('load');
      this.electronService.ipcRenderer.on('loadResult', (event, args) => {
        this.ngZone.run( () => this.loadData(args) );
      });
    } else {
      // console.log('browser app');
      this.loadData([]);
    }
  }

  loadData(tasks: Task[]) {
    // console.log('loadData', tasks);
    this.tasks = tasks.map((item: Task) => {
      item.start = new Date(item.start);
      if (item.end) {
        item.end = new Date(item.end);
      }
      return item;
    });
    this.setDate(null);
  }

  getTodayTasks() {
    // console.log('selected date:', this.selectedDate);
    // console.log('tasks', this.tasks);
    this.activeTask = undefined;
    this.todayTasks = this.tasks.filter( (task) => {
      const dayEnd = new Date(this.selectedDate.getTime());
      dayEnd.setHours(23);
      dayEnd.setMinutes(59);
      dayEnd.setSeconds(59);
      dayEnd.setMilliseconds(999);
      return task.start >= this.selectedDate && task.start <= dayEnd;
    });
    // console.log('todayTasks', this.todayTasks);
    if (this.todayTasks.length > 0 && this.todayTasks[this.todayTasks.length - 1].end === null) {
      this.activeTask = this.todayTasks[this.todayTasks.length - 1];
    }
    this.updateTotals();
  }

  beginTask(newTask) {
    if (typeof(newTask) !== 'undefined' && newTask && newTask !== '') {
      const now = new Date();
      now.setDate(this.selectedDate.getDate());
      now.setMonth(this.selectedDate.getMonth());
      now.setFullYear(this.selectedDate.getFullYear());
      now.setSeconds(0);
      now.setMilliseconds(0);
      this.activeTask = {
        name: newTask,
        start: now,
        end: null
      } as Task;

      this.tasks.push(this.activeTask);
      this.newTask = null;
      this.saveData();
    }
  }

  saveData() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('save', this.tasks);
    }
    this.getTodayTasks();
  }

  switchTask(newTask) {
    if (typeof(newTask) !== 'undefined' && newTask && newTask !== '') {
      if (typeof(this.activeTask) !== 'undefined') { this.endTask(); }
      this.beginTask(newTask);
    }
  }

  endTask() {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    this.tasks.find(x => x.name === this.activeTask.name && x.start === this.activeTask.start && x.end === this.activeTask.end ).end = now;
    this.activeTask = undefined;
    this.saveData();
  }

  getDurationString(task: Task) {
    if (typeof(task) !== 'undefined') {
      let end = new Date();
      if (task.end && task.end !== null) {
        end = task.end;
      }
      const difference = end.getTime() - task.start.getTime();
      let hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      let minutes = Math.floor((difference / (1000 * 60)) % 60);
      if (hours < 0) { hours = 0; }
      if (minutes < 0) { minutes = 0; }
      return hours + 'h ' + minutes + 'min';
    } else {
      return '';
    }
  }

  getDurationPill(task: Task) {
    if (typeof(task) !== 'undefined') {
      let end = new Date();
      if (task.end && task.end !== null) {
        end = task.end;
      }
      const difference = end.getTime() - task.start.getTime();
      let hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      let minutes = Math.floor((difference / (1000 * 60)) % 60);
      if (hours < 0) { hours = 0; }
      if (minutes < 0) { minutes = 0; }
      return this.zeroPad(hours, 2) + ':' + this.zeroPad(minutes, 2);
    } else {
      return '';
    }
  }

  zeroPad(num, places) {
    const zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join('0') + num;
  }

  datePicker(event) {
    if (event.target.value) {
      this.setDate(new Date(event.target.value));
    } else {
      this.setDate(new Date());
    }
  }

  setDate(newDate) {
    if (newDate === null) { newDate = new Date(); }
    newDate.setHours(0);
    newDate.setMinutes(0);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    this.selectedDate = newDate;
    this.getTodayTasks();
  }

  dayBefore() {
    const dayBefore = new Date(this.selectedDate.getTime());
    dayBefore.setDate(dayBefore.getDate() - 1);
    this.setDate(dayBefore);
  }

  dayAfter() {
    const dayAfter = new Date(this.selectedDate.getTime());
    dayAfter.setDate(dayAfter.getDate() + 1);
    this.setDate(dayAfter);
  }

  updateTotals() {
    const totals = {};
    // console.log('updateTotals called, todayTasks ', this.todayTasks);
    let maxValue = 0;
    this.totalHours = 0;
    for (const task of this.todayTasks) {
      // console.log('processing task ', task);
      if (!totals.hasOwnProperty(task.name)) {
        // console.log('creating ' + task.name + ' key in totals');
        totals[task.name] = {total: 0};
      }
      totals[task.name].name = task.name;
      let tempEnd = new Date();
      if (task.end == null && !totals[task.name].active) {
        // console.log('setting task end date to now');
        totals[task.name].active = true;
      } else {
        tempEnd = task.end;
        totals[task.name].active = false;
      }
      const duration = tempEnd.getTime() - task.start.getTime();
      totals[task.name].total += duration;
      this.totalHours += duration;
      if (totals[task.name].total > maxValue) {
        maxValue = totals[task.name].total;
      }
    }

    const sortable = [];
    for (const taskName of Object.keys(totals)) {
      totals[taskName].percent = 100;
      if (totals[taskName].total < maxValue) {
        totals[taskName].percent = Math.round(totals[taskName].total * 100 / maxValue);
      }
      sortable.push([totals[taskName], totals[taskName].total]);
    }

    this.totalHours = (Math.round(((this.totalHours / (1000 * 60 * 60)) % 24) * 4) / 4).toFixed(2);

    sortable.sort( (a, b) => {
      return b[1] - a[1];
    });

    this.totals = sortable;

    // console.log('calculated totals ', this.totals);
  }

  millisToDecH(millis) {
    return (Math.round(((millis / (1000 * 60 * 60)) % 24) * 4) / 4).toFixed(2);
  }

  clearSelection() {
    this.selectedTask = undefined;
    this.openTask = undefined;
  }

  selectTask(task) {
    this.selectedTask = task;
    console.log('selected task', task);
  }

  editTask() {
    this.openTask = {
      name: this.selectedTask.name,
      startTime: this.selectedTask.start.getHours() + ':' + this.selectedTask.start.getMinutes(),
      endTime: null
    };
    if (this.selectedTask.end) {
      this.openTask.endTime = this.selectedTask.end.getHours() + ':' + this.selectedTask.end.getMinutes();
    }
    console.log('editing task', this.openTask);
  }

  saveTask() {
    console.log('saving task', this.openTask);
    this.selectedTask.name = this.openTask.name;
    this.openTask.startTime = this.openTask.startTime.toString();
    this.openTask.endTime = this.openTask.startTime.toString();
    if (this.openTask.startTime.match(/[0-9]{2}:[0-9]{2}/)) {
      const startTime = this.openTask.startTime.split(':');
      console.log('startTime', startTime);
      this.selectedTask.start.setHours(startTime[0]);
      this.selectedTask.start.setMinutes(startTime[1]);
    }
    if (this.openTask.endTime.match(/[0-9]{2}:[0-9]{2}/)) {
      const endTime = this.openTask.endTime.split(':');
      console.log('endTime', endTime);
      if (!this.selectedTask.end) {
        this.selectedTask.end = new Date(this.selectedTask.start.getTime());
      }
      this.selectedTask.start.setHours(endTime[0]);
      this.selectedTask.start.setMinutes(endTime[1]);
    }
    this.clearSelection();
    this.saveData();
  }

  getTaskIndex(task: Task) {
    const foundIndex = this.tasks.indexOf(this.selectedTask);
    const foundTodayIndex = this.todayTasks.indexOf(this.selectedTask);
    return {index: foundIndex, todayIndex: foundTodayIndex};
  }

  deleteTask() {
    const indexes = this.getTaskIndex(this.selectedTask);
    if (indexes.index > -1) {
      this.tasks.splice(indexes.index, 1);
    }
    if (indexes.todayIndex > -1) {
      this.todayTasks.splice(indexes.todayIndex, 1);
    }
    this.clearSelection();
    this.saveData();
  }
}
