import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../services/api.service';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-estimate-history',
    templateUrl: './estimate-history.page.html',
    styleUrls: ['./estimate-history.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class EstimateHistoryPage implements ViewDidEnter {
    estimates = signal<any[]>([]);
    isLoading = signal(false);

    constructor(private api: ApiService, private router: Router) { }

    ionViewDidEnter() {
        this.loadEstimates();
    }

    loadEstimates() {
        this.isLoading.set(true);
        this.api.getEstimates().subscribe({
            next: (data) => {
                this.estimates.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    editEstimate(estimate: any) {
        this.api.estimateToEdit.set(estimate);
        this.router.navigate(['/estimate-entry']);
    }

    deleteEstimate(id: number) {
        if (confirm('Are you sure you want to delete this estimate?')) {
            this.api.deleteEstimate(id).subscribe(() => this.loadEstimates());
        }
    }
}
