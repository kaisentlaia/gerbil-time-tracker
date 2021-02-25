import { Component, AfterViewInit, NgZone } from '@angular/core';
import { Task } from './task.model';
import { Observable, interval, Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { faMagic, faCaretRight, faCaretLeft } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'gerbil';
  private updateSubscription: Subscription;
  faMagic = faMagic;
  faCaretRight = faCaretRight;
  faCaretLeft = faCaretLeft;

  debugLevel = 1;

  tasks: Task[];
  todayTasks: Task[];
  activeTask: Task;
  selectedTask: Task;
  openTask: any;
  newTask: string;
  selectedDate: Date;
  totals: any[];
  totalHours: any;
  useMagic: boolean;

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
    this.useMagic = true;
  }

  ngAfterViewInit() {
    // this.debug('this.electronService.isElectronApp', this.electronService.isElectronApp);
    if (this.electronService.isElectronApp) {
      // this.debug('electron app');
      this.electronService.ipcRenderer.send('load');
      this.electronService.ipcRenderer.on('loadResult', (event, args) => {
        this.ngZone.run( () => this.loadData(args) );
      });
    } else {
      // this.debug('browser app');
      this.loadData([
        {
          name: 'yesterday',
          start: new Date('2021-02-20T11:13:00.000Z'),
          end: new Date('2021-02-20T11:13:00.000Z')
        },
        {
          name: 'uno',
          start: new Date('2021-02-21T11:13:00.000Z'),
          end: new Date('2021-02-21T12:19:00.000Z')
        },
        {
          name: 'due',
          start: new Date('2021-02-21T12:19:00.000Z'),
          end: new Date('2021-02-21T15:30:00.000Z')
        },
        {
          name: 'anotherthing',
          start: new Date('2021-02-21T15:30:00.000Z'),
          end: new Date('2021-02-21T15:32:00.000Z')
        },
        {
          name: 'zzzzz',
          start: new Date('2021-02-21T15:32:00.000Z'),
          end: new Date('2021-02-21T15:51:00.000Z')
        },
        {
          name: 'anotherthing',
          start: new Date('2021-02-21T15:51:00.000Z'),
          end: new Date('2021-02-21T16:06:00.000Z')
        },
        {
          name: 'zzzzz',
          start: new Date('2021-02-21T16:06:00.000Z'),
          end: new Date('2021-02-21T16:54:00.000Z')
        },
        {
          name: 'uno',
          start: new Date('2021-02-21T16:54:00.000Z'),
          end: new Date('2021-02-21T17:12:00.000Z')
        },
        {
          name: 'nuovo',
          start: new Date('2021-02-21T17:12:00.000Z'),
          end: new Date('2021-02-21T17:20:00.000Z')
        },
        {
          name: 'uno',
          start: new Date('2021-02-21T17:20:00.000Z'),
          end: null
        }
      ]);
    }
  }

  loadData(tasks: Task[]) {
    this.debug(['loadData', tasks], 3);
    this.tasks = tasks.map((item: Task) => {
      item.start = new Date(item.start);
      if (item.end) {
        item.end = new Date(item.end);
      }
      return item;
    });
    this.setDate(null);
  }

  updateTodayTasks() {
    this.debug(["updateTodayTasks"],3);
    // this.debug('selected date:', this.selectedDate);
    // this.debug('tasks', this.tasks);
    this.activeTask = undefined;
    this.todayTasks = this.getTodayTasks();
    // this.debug('todayTasks', this.todayTasks);
    if (this.todayTasks.length > 0 && this.todayTasks[this.todayTasks.length - 1].end === null) {
      this.activeTask = this.todayTasks[this.todayTasks.length - 1];
    }
    this.updateTotals();
  }

  getTodayTasks() {
    return this.tasks.filter( (task) => {
      const dayEnd = new Date(this.selectedDate.getTime());
      dayEnd.setHours(23);
      dayEnd.setMinutes(59);
      dayEnd.setSeconds(59);
      dayEnd.setMilliseconds(999);
      return task.start >= this.selectedDate && task.start <= dayEnd;
    });
  }

  beginTask(newTask) {
    this.debug(["beginTask"],3);
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
    this.debug(["saveData"],3);
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('save', this.tasks);
    }
    this.updateTodayTasks();
  }

  switchTask(newTask) {
    this.debug(["switchTask"],3);
    if (typeof(newTask) !== 'undefined' && newTask && newTask !== '') {
      if (typeof(this.activeTask) !== 'undefined') { this.endTask(); }
      this.beginTask(newTask);
    }
  }

  endTask() {
    this.debug(["endTask"],3);
    let dayEnd = new Date(this.selectedDate.getTime());
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);
    dayEnd.setMilliseconds(999);
    let now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    if(dayEnd<now) {
      now = dayEnd;
    }
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
    this.clearSelection();
    newDate.setHours(0);
    newDate.setMinutes(0);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    this.selectedDate = newDate;
    this.updateTodayTasks();
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
    this.debug(["updateTotals"],3);
    const totals = {};
    // this.debug('updateTotals called, todayTasks ', this.todayTasks);
    let maxValue = 0;
    this.totalHours = 0;
    for (const task of this.todayTasks) {
      // this.debug('processing task ', task);
      if (!totals.hasOwnProperty(task.name)) {
        // this.debug('creating ' + task.name + ' key in totals');
        totals[task.name] = {total: 0};
      }
      totals[task.name].name = task.name;
      let tempEnd = new Date();
      if (task.end == null && !totals[task.name].active) {
        // this.debug('setting task end date to now');
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

    // this.debug('calculated totals ', this.totals);
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
    this.debug(['selected task', task],3);
  }

  editTask() {
    this.openTask = {
      name: this.selectedTask.name,
      startTime: this.zeroPad(this.selectedTask.start.getHours(), 2) + ':' + this.zeroPad(this.selectedTask.start.getMinutes(), 2),
      endTime: null
    };
    if (this.selectedTask.end) {
      this.openTask.endTime = this.selectedTask.end.getHours() + ':' + this.selectedTask.end.getMinutes();
    }
    this.debug(['editing task', this.openTask],3);
  }

  saveTask() {
    this.debug(['saving task', this.openTask],3);
    // new object to avoid overwriting problems
    const savedTask = this.selectedTask;

    // parsing form data
    savedTask.name = this.openTask.name;
    this.openTask.startTime = this.openTask.startTime.toString();
    this.openTask.endTime = this.openTask.endTime.toString();
    if (this.openTask.startTime.match(/[0-9]{2}:[0-9]{2}/)) {
      const startTime = this.openTask.startTime.split(':');
      savedTask.start.setHours(startTime[0]);
      savedTask.start.setMinutes(startTime[1]);
    }
    if (this.openTask.endTime.match(/[0-9]{2}:[0-9]{2}/)) {
      const endTime = this.openTask.endTime.split(':');
      if (!savedTask.end) {
        savedTask.end = new Date(savedTask.start.getTime());
      }
      savedTask.end.setHours(endTime[0]);
      savedTask.end.setMinutes(endTime[1]);
      this.activeTask = undefined;
    } else {
      savedTask.end = null;
    }
    if (savedTask.start > savedTask.end) {
      savedTask.end = savedTask.start;
    }

    if (this.useMagic) {
      // first, let's process all the past events in reverse order
      let savedFound = false;
      this.todayTasks.reverse().map( (task, index) => {
        const prevIndex = index + 1;
        const prevTask = prevIndex < this.todayTasks.length ? this.todayTasks[prevIndex] : null;
        const isSelected = task === savedTask;
        if(savedFound || isSelected) {
          if(!savedFound) { savedFound = isSelected; }
          if (task.end && task.start > task.end) {
            this.debug(["task.start > task.end", task.start, task.end],3);
            task.end = new Date(task.start.getTime());
          }
          if ( prevTask?.end && task.start.getTime() != prevTask?.end.getTime() ) {
            this.debug(["task.end != prevTask?.start", task.end, prevTask?.start],1);
            prevTask.end = new Date(task.start.getTime());
          }
        }
      });

      // then again in the original order
      savedFound = false;
      this.todayTasks.reverse().map( (task, index) => {
        const nextIndex = index + 1;
        const nextTask = nextIndex < this.todayTasks.length ? this.todayTasks[nextIndex] : null;
        const isSelected = task === savedTask;
        if(savedFound || isSelected) {
          if(!savedFound) { savedFound = isSelected; }
          if (task.end && task.start > task.end) {
            this.debug(["task.start > task.end", task.start, task.end],1);
            task.end = new Date(task.start.getTime());
          }
          if(task.end && task.end.getTime() != nextTask?.start.getTime()) {
            this.debug(["task.end != nextTask?.start", task.end, nextTask?.start],1);
            nextTask.start = new Date(task.end.getTime());
          }
        }
      });

      // this.todayTasks = this.todayTasks.filter( (task) => {
      //   let tooShort = task.start === task.end;
      //   if(tooShort) {
      //     this.debug(["task too short, deleting", task, "-------"],1);
      //   }
      //   return !tooShort;
      // });
    }
    // this.debug(["this.todayTasks now is", this.todayTasks, "-------"],1);

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

  private debug(messages, level) {
    if(this.debugLevel>0 && level<=this.debugLevel) {
      messages.map((message) => {
        console.debug(message);
      });
    }
  }
}
