import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { GotItDialogDataModel } from "./got-it-dialog-data.model";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Component({
  selector: "app-got-it-dialog",
  templateUrl: "./got-it-dialog.component.html",
  styleUrls: ["./got-it-dialog.component.scss"]
})
export class GotItDialogComponent implements OnInit {
  public static readonly MAX_WIDTH: string = "80%";
  public static readonly MIN_WIDTH: string = "40%";

  public html: SafeHtml;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly dialogData: GotItDialogDataModel,
    @Inject(DomSanitizer) private readonly domSanitizer: DomSanitizer
  ) {}

  public ngOnInit(): void {
    this.html = this.domSanitizer.bypassSecurityTrustHtml(this.dialogData.content);
  }
}
