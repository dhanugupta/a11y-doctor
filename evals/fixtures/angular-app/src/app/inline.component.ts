import { Component } from '@angular/core';

@Component({
  selector: 'app-inline',
  template: `
    <!-- expect: img-alt -->
    <img src="/banner.png">
    <button type="button" (click)="save()">Save</button>
  `,
})
export class InlineComponent {
  items: Array<string> = [];
  save() {}
}
