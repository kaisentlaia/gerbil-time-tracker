import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TodayTasksComponent } from './today-tasks/today-tasks.component';
import { EditTaskComponent } from './edit-task/edit-task.component';
import { SummaryComponent } from './summary/summary.component';
import { NewTaskComponent } from './new-task/new-task.component';

@NgModule({
  declarations: [
    AppComponent,
    TodayTasksComponent,
    EditTaskComponent,
    SummaryComponent,
    NewTaskComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
