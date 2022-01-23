/* eslint-disable @angular-eslint/component-selector */
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from "@angular/core";
import katex from "katex";

@Component({
  selector: "katex",
  template: `<span #element></span>`,
  styleUrls: ["./katex-expression.component.scss"]
})
export class KatexExpressionComponent implements AfterViewInit {
  @Input()
  public expression: string;

  @ViewChild("element", { static: true })
  public element: ElementRef;

  constructor() {}

  public ngAfterViewInit(): void {
    katex.render(this.expression, this.element.nativeElement);
  }
}
