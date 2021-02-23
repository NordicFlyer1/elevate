import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AppRoutesModel } from "../shared/models/app-routes.model";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";
import { ConfirmDialogDataModel } from "../shared/dialogs/confirm-dialog/confirm-dialog-data.model";

@Component({
	selector: "app-promote-desktop",
	templateUrl: "./promote-desktop.component.html",
	styleUrls: ["./promote-desktop.component.scss"]
})
export class PromoteDesktopComponent implements OnInit {

	public static readonly NO_PROMOTE_DESKTOP_MENU_LC_KEY = "NO_PROMOTE_DESKTOP_MENU_2";

	constructor(public router: Router,
				public dialog: MatDialog) {
	}

	public ngOnInit(): void {
	}

	public onDonateClicked(): void {
		this.router.navigate([AppRoutesModel.donate]);
	}

	public onReadStory(): void {
		window.open("https://champagnethomas.medium.com/elevate-desktop-app-2021-update-9155fd74bb85", "_blank");
	}

	public onHideMenu(): void {

		const dialogRef = this.dialog.open(ConfirmDialogComponent, {
			data: <ConfirmDialogDataModel> {
				content: "Sure? You won't be able to access this section anymore."
			}
		});

		dialogRef.afterClosed().subscribe(confirmed => {
			if (confirmed) {
				localStorage.setItem(PromoteDesktopComponent.NO_PROMOTE_DESKTOP_MENU_LC_KEY, "true");
				this.router.navigate([AppRoutesModel.activities]);
				setTimeout(() => window.location.reload(), 100);
			}
		});
	}
}
