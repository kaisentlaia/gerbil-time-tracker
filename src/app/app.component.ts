import { Component, AfterViewChecked, NgZone, ViewChild, ElementRef, OnInit, ViewEncapsulation } from '@angular/core';
import { Task } from './task.model';
import { Observable, interval, Subscription } from 'rxjs';
import {debounceTime, distinctUntilChanged, map} from 'rxjs/operators';


import { ElectronService } from 'ngx-electron';
import { faMagic, faCaretRight, faCaretLeft, faCalendar, faCalendarAlt, faCalendarCheck, faCalendarDay, faPlay, faStop, faRandom } from '@fortawesome/free-solid-svg-icons';

let taskNames = [] as string[];

const FILTER_ALL = 0;
const FILTER_EMPTY = 1;
const FILTER_FULL = 2;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements AfterViewChecked, OnInit {
  title = 'gerbil';
  private updateSubscription: Subscription;
  @ViewChild('taskNameNew') taskNameNew: ElementRef;
  @ViewChild('taskNameEdit') taskNameEdit: ElementRef;
  readonly FILTER_ALL = FILTER_ALL;
  readonly FILTER_EMPTY = FILTER_EMPTY;
  readonly FILTER_FULL = FILTER_FULL;
  readonly faMagic = faMagic;
  readonly faCaretRight = faCaretRight;
  readonly faCaretLeft = faCaretLeft;
  readonly faCalendar = faCalendar;
  readonly faCalendarAlt = faCalendarAlt;
  readonly faCalendarCheck = faCalendarCheck;
  readonly faCalendarDay = faCalendarDay;
  readonly faPlay = faPlay;
  readonly faStop = faStop;
  readonly faRandom = faRandom;

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
  filterDays: number;

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
    this.filterDays = FILTER_ALL;
    // this.debug('this.electronService.isElectronApp', this.electronService.isElectronApp);
    if (this.electronService.isElectronApp) {
      // this.debug('electron app');
      this.electronService.ipcRenderer.send('load');
      this.electronService.ipcRenderer.on('loadResult', (event, args) => {
        this.ngZone.run( () => this.loadData(args) );
      });
    } else {
      // this.debug('browser app');
      this.loadData([]);
    }
  }

  ngAfterViewChecked() {
    taskNames = this.tasks?.map( (item) => {
      return item.name;
    }).filter((value, index, self) => self.indexOf(value) === index);
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
    this.debug(['updateTodayTasks'], 3);
    this.activeTask = undefined;
    this.todayTasks = this.getDayTasks(this.selectedDate);
    if (this.todayTasks.length > 0 && this.todayTasks[this.todayTasks.length - 1].end === null) {
      this.activeTask = this.todayTasks[this.todayTasks.length - 1];
    }
    this.updateTotals();
  }

  getDayTasks(date: Date) {
    return this.tasks.filter( (task) => {
      const dayEnd = new Date(date.getTime());
      dayEnd.setHours(23);
      dayEnd.setMinutes(59);
      dayEnd.setSeconds(59);
      dayEnd.setMilliseconds(999);
      return task.start >= date && task.start <= dayEnd;
    });
  }

  beginTask(newTask) {
    this.debug(['beginTask'], 3);
    if (typeof(newTask) !== 'undefined' && newTask && newTask.trim() !== '') {
      const now = new Date();
      now.setDate(this.selectedDate.getDate());
      now.setMonth(this.selectedDate.getMonth());
      now.setFullYear(this.selectedDate.getFullYear());
      now.setSeconds(0);
      now.setMilliseconds(0);
      this.activeTask = {
        name: newTask.trim(),
        start: now,
        end: null
      } as Task;

      this.tasks.push(this.activeTask);
      this.newTask = null;
      this.saveData();
      this.taskNameNew?.nativeElement.focus();
    }
  }

  saveData() {
    this.debug(['saveData'], 3);
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('save', this.tasks);
    }
    this.updateTodayTasks();
  }

  switchTask(newTask) {
    this.debug(['switchTask'], 3);
    if (typeof(newTask) !== 'undefined' && newTask && newTask.trim() !== '') {
      if (newTask.trim() !== this.activeTask?.name) {
        if (typeof(this.activeTask) !== 'undefined') { this.endTask(); }
        this.beginTask(newTask.trim());
      } else {
        this.newTask = null;
        this.taskNameNew?.nativeElement.focus();
      }
    }
  }

  endTask() {
    this.debug(['endTask'], 3);
    const dayEnd = new Date(this.selectedDate.getTime());
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);
    dayEnd.setMilliseconds(999);
    let now = new Date();
    now.setDate(this.selectedDate.getDate());
    now.setMonth(this.selectedDate.getMonth());
    now.setFullYear(this.selectedDate.getFullYear());
    now.setSeconds(0);
    now.setMilliseconds(0);
    if (this.activeTask.start > now) {
      now = new Date(this.activeTask.start.getTime());
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
      return (hours + minutes) > 0 ? hours + 'h ' + minutes + 'min' : 'just started';
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
    this.taskNameNew?.nativeElement.focus();
  }

  dayBefore() {
    const dayBefore = new Date(this.selectedDate.getTime());
    dayBefore.setDate(dayBefore.getDate() - 1);
    this.setDate(dayBefore);
    if (this.filterDays !== FILTER_ALL) {
      const yearStart = new Date(this.selectedDate.getTime());
      yearStart.setMonth(0, 1);
      let dayTasks = this.getDayTasks(dayBefore);
      let found = this.filterDays === FILTER_FULL ? dayTasks.length > 0 : dayTasks.length === 0;
      while (!found && dayBefore > yearStart) {
        dayBefore.setDate(dayBefore.getDate() - 1);
        this.debug(['checking', dayBefore], 1);
        this.setDate(dayBefore);
        dayTasks = this.getDayTasks(dayBefore);
        found = this.filterDays === FILTER_FULL ? dayTasks.length > 0 : dayTasks.length === 0;
      }
    }
  }

  dayAfter() {
    const dayAfter = new Date(this.selectedDate.getTime());
    dayAfter.setDate(dayAfter.getDate() + 1);
    this.setDate(dayAfter);
    if (this.filterDays !== FILTER_ALL) {
      const yearEnd = new Date(this.selectedDate.getTime());
      yearEnd.setMonth(11, 31);
      let dayTasks = this.getDayTasks(dayAfter);
      let found = this.filterDays === FILTER_FULL ? dayTasks.length > 0 : dayTasks.length === 0;
      while (!found && dayAfter < yearEnd) {
        dayAfter.setDate(dayAfter.getDate() + 1);
        this.debug(['checking', dayAfter], 1);
        this.setDate(dayAfter);
        dayTasks = this.getDayTasks(dayAfter);
        found = this.filterDays === FILTER_FULL ? dayTasks.length > 0 : dayTasks.length === 0;
      }
    }
  }

  updateTotals() {
    this.debug(['updateTotals'], 3);
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
    this.taskNameNew?.nativeElement.focus();
  }

  selectTask(task) {
    this.selectedTask = task;
    this.debug(['selected task', task], 3);
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
    this.taskNameEdit?.nativeElement.focus();
    this.debug(['editing task', this.openTask], 3);
  }

  saveTask() {
    this.debug(['saving task', this.openTask], 3);
    const savedTask = this.selectedTask;

    // parsing form data
    savedTask.name = this.openTask.name;
    if (this.openTask.startTime.match(/[0-9]{2}:[0-9]{2}/)) {
      this.openTask.startTime = this.openTask.startTime.toString();
      const startTime = this.openTask.startTime.split(':');
      savedTask.start.setHours(startTime[0]);
      savedTask.start.setMinutes(startTime[1]);
    }
    if (this.openTask.endTime?.match(/[0-9]{2}:[0-9]{2}/)) {
      this.openTask.endTime = this.openTask.endTime.toString();
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
    if (savedTask.end && savedTask.start > savedTask.end) {
      savedTask.end = savedTask.start;
    }

    if (this.useMagic) {
      // first, let's process all the past events in reverse order
      let savedFound = false;
      this.todayTasks.reverse().map( (task, index) => {
        const prevIndex = index + 1;
        const prevTask = prevIndex < this.todayTasks.length ? this.todayTasks[prevIndex] : null;
        const isSelected = task === savedTask;
        if (savedFound || isSelected) {
          if (!savedFound) { savedFound = isSelected; }
          if (task.end && task.start > task.end) {
            this.debug(['task.start > task.end', task.start, task.end], 3);
            task.end = new Date(task.start.getTime());
          }
          if ( prevTask && prevTask?.end && task.start.getTime() != prevTask?.end.getTime() ) {
            this.debug(['task.end != prevTask?.start', task.end, prevTask?.start], 1);
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
        if (savedFound || isSelected) {
          if (!savedFound) { savedFound = isSelected; }
          if (task.end && task.start > task.end) {
            this.debug(['task.start > task.end', task.start, task.end], 1);
            task.end = new Date(task.start.getTime());
          }
          if (nextTask && task.end && task.end.getTime() != nextTask?.start.getTime()) {
            this.debug(['task.end != nextTask?.start', task.end, nextTask?.start], 1);
            nextTask.start = new Date(task.end.getTime());
          }
        }
      });

    }

    this.clearSelection();
    this.saveData();
  }

  getTaskIndex(task: Task) {
    const foundIndex = this.tasks.indexOf(this.selectedTask);
    const foundTodayIndex = this.todayTasks.indexOf(this.selectedTask);
    return {index: foundIndex, todayIndex: foundTodayIndex};
  }

  // MAYBE add modal before delete?
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

  search(text$: Observable<string>) {

    return text$.pipe(
      debounceTime(100),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : taskNames.filter( name => name?.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10) )
    );
  }

  private debug(messages, level) {
    if (this.debugLevel > 0 && level <= this.debugLevel) {
      messages.map((message) => {
        console.debug(message);
      });
    }
  }
}
