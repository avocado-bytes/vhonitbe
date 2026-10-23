import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * A side view of a rifle with a riflescope, drawn as a monochrome outline in the text color,
 * showing how to measure the sight height: the distance between the bore axis and the scope axis
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-sight-height-diagram',
  styleUrl: './sight-height-diagram.scss',
  templateUrl: './sight-height-diagram.html',
})
export class SightHeightDiagram {}
