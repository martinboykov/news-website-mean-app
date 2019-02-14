import { HeaderService } from './../header.service';
import { ActivatedRoute, Router, ParamMap, NavigationEnd, Params } from '@angular/router';
import { Component, OnInit, Input } from '@angular/core';
import { map, switchMap, filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
@Component({
  selector: 'app-small-nav',
  templateUrl: './small-nav.component.html',
  styleUrls: ['./small-nav.component.scss']
})
export class SmallNavComponent implements OnInit {
  routerParameters;
  routerParametersSubscription: Subscription;
  category;
  subcategory;
  name;
  routes: any[] = [];
  // currentRoute: any;

  constructor(private headerService: HeaderService) { }

  ngOnInit() {
    this.routerParametersSubscription = this.headerService.getRouterParametersUpdateListener()
      .subscribe((params) => {
        this.routes = [];
        // this.routes.push({ name: 'Home', link: '' });
        this.routerParameters = params;
        if (this.routerParameters.has('category')) {
          this.category = this.routerParameters.get('category');
          this.routes.push({
            name: this.category,
            link: this.category
          });
        }
        if (this.routerParameters.has('subcategory')) {
          this.subcategory = this.routerParameters.get('subcategory');
          this.routes.push({
            name: this.subcategory,
            link: `${this.category}/${this.subcategory}`
          });
          if (this.routerParameters.has('name')) {
            this.name = this.routerParameters.get('name');
            this.routes.push({
              name: this.name,
              link: `${this.category}/${this.subcategory}/post/${this.name}`
            });
          }
        } else {
          if (this.routerParameters.has('name')) {
            this.name = this.routerParameters.get('name');
            this.routes.push({
              name: this.name,
              link: `${this.category}/post/${this.name}`
            });
          }
        }
      });

    // this.router.events.subscribe((val) => {
    //   if (location.pathname != '') {
    //     this.currentRoute = location.pathname;
    //   } else {
    //     this.currentRoute = 'Home'
    //   }
    // });
  }
}