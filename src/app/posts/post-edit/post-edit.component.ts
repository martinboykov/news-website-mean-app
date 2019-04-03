import { CategoryService } from './../../admin/category.service';
// import { HeaderService } from './../../header/header.service';
import { ActivatedRoute, } from '@angular/router';
import { FormGroup, FormControl, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Component, OnInit, OnDestroy, Renderer2, ViewChild, AfterViewInit, AfterContentInit } from '@angular/core';
import { Post } from './../post.model';
import { PostService } from '../post.service';
import { mimeType } from './mime-type.validator';
import { Subscription, timer, Subject, Observable, concat, of, from } from 'rxjs';
import { tap, delay, concatMap, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { WindowRef } from 'src/app/shared/winref.service';

@Component({
  selector: 'app-post-edit',
  templateUrl: './post-edit.component.html',
  styleUrls: ['./post-edit.component.scss']
})
export class PostEditComponent implements OnInit, AfterViewInit, AfterContentInit, OnDestroy {
  @ViewChild('jodit') jodit;
  @ViewChild('selectTags') selectTags;
  mode;
  postId: string;
  postForm: FormGroup;
  imagePreview: any;
  post: Post;
  categories: any[] = [];
  subcategories: any[] = [];
  categoryselected;
  contentTextOnly = '';
  tagsArray: Observable<any[]>;
  loading: boolean;
  loadingPosts = false;
  searchedTag = '';
  tagsInput = new Subject<string>();
  isIEOrEdge;
  private categoriesSubscription: Subscription;
  jodiConfig = {
    // defaultMode: '3',
    height: 450,
    autofocus: true,
    enter: 'DIV',
    // uploader: {
    //   insertImageAsBase64URI: true,
    // },
    defaultActionOnPaste: 'insert_only_text',
    buttons: `source,
     |,bold,strikethrough,underline,italic,
     |,superscript,subscript,align,|,outdent,indent,|,ul,ol,
     |,font,fontsize,brush,paragraph,|,table,link,
     |,undo,redo,\n,cut,hr,eraser,copyformat,
     |,symbol,selectall,print`
  };

  @ViewChild(ImageCropperComponent) imageCropper: ImageCropperComponent;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  showCropper = false;
  fileName: string;

  constructor(
    private postService: PostService,
    // private headerService: HeaderService,
    private categoryService: CategoryService,
    public route: ActivatedRoute,
    private renderer: Renderer2,
    private windowRef: WindowRef,
  ) { }

  ngOnInit() {
    // throw new Error('My Pretty Error'); // for teting
    this.isIEOrEdge = /msie\s|trident\/|edge\//i.test(this.windowRef.nativeWindow.navigator.userAgent);
    this.postForm = new FormGroup({
      image: new FormControl('', {
        validators: [Validators.required],
        asyncValidators: [mimeType]
      }),
      title: new FormControl('', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(200)]),
      content: new FormControl(null, [
        Validators.required,
        this.contentValidatorLengthMin.bind(this),
        this.contentValidatorLengthMax.bind(this)]),
      category: new FormControl(null, [
        Validators.required]),
      subcategory: new FormControl(null, []),
      tags: new FormControl([], [
        this.tagsValidatorRequired,
        this.tagsValidatorLength,
        this.tagsValidatorCharacter,
      ])
    });

    // get mode(create/update) and Post ID
    this.postId = this.route.snapshot.params._id;
    if (this.postId) {
      this.mode = 'update';
      // 1. (async) get post
      this.postService.getPost(this.postId)
        .pipe(
          // delay(5000),
          concatMap((postData) => {
            // .subscribe((postData) => {
            this.post = postData.post;
            this.postForm.controls.image.setValue(this.post.imageMainPath);
            this.postForm.controls.title.setValue(this.post.title);
            this.postForm.controls.content.setValue(this.post.content);
            this.postForm.controls.category.setValue(this.post.category.name);
            const tagsArray = this.post.tags.reduce((accumulator, currentValue) => {
              accumulator.push(currentValue.name);
              return accumulator;
            }, []);
            this.postForm.controls.tags.setValue([...tagsArray]);


            this.loadTags();
            // 2. (async) get Categories -> to fill the ng-select categories options
            // and set the post category
            this.categoryService.getCategories();
            return this.categoryService.getCategoriesUpdateListener();
          })
        )
        .subscribe((categories) => {
          this.categories = [...categories];
          let currentCategory;
          currentCategory = this.categories.filter((category) => {
            if (category.name === this.post.category.name) {
              return category;
            }
          })[0];

          // 2.1. (sync) get Subcategories -> to fill the ng-select subcategories options (if such exists)
          if (currentCategory.subcategories) {
            this.subcategories = currentCategory.subcategories.reduce((accumulator, currentValue) => {
              accumulator.push(currentValue.name);
              return accumulator;
            }, []);
          }
          // 2.2. (sync) set ng-select subcategory input field (if such exists)
          if (this.post.subcategory) {
            this.postForm.controls.subcategory.setValue(this.post.subcategory.name);
          }

        });
    } else {
      this.mode = 'create';
      this.postId = null;
      this.loadTags();
      this.categoriesSubscription = this.categoryService.getCategoriesUpdateListener()
        .subscribe((categories: any[]) => {
          this.categories = [...categories];
        });


      // mongodb fake posts loading
      // -------------------------

      // this.addPosts({category: 'bulgaria', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553721504042_bulgaria.jpeg'});

      // this.addPosts({ category: 'world', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553721664677_world.jpeg' });

      // this.addPosts({ category: 'sport', subcategory: 'football', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553722305554_lionel-messi.jpeg' });
      // this.addPosts({ category: 'sport', subcategory: 'basketball', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553720010256_nba1920x1080.jpeg' });
      // this.addPosts({ category: 'sport', subcategory: 'tennis', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553721196375_tennis.jpeg' });

      // this.addPosts({ category: 'entertainment', subcategory: 'movies', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553719797744_thematrix1999.jpeg' });
      // this.addPosts({ category: 'entertainment', subcategory: 'music', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553722473731_u2.jpeg' });
      // this.addPosts({ category: 'entertainment', subcategory: 'tv', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553722732688_truedetective.jpeg' });

      // this.addPosts({ category: 'technology', subcategory: 'smartphones', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553723207397_smartphone.jpeg' });
      // this.addPosts({ category: 'technology', subcategory: 'cars', imageUrl: 'https://storage.googleapis.com/thenewsroom-images-storage-bucket/1553722877470_tesla.jpeg' });

      // -------------------------
    }


  }
  ngAfterContentInit() {
  }
  ngAfterViewInit() {
  }

  get title() { return this.postForm.get('title'); }
  get category() { return this.postForm.get('category'); }
  get subcategory() { return this.postForm.get('subcategory'); }
  get tags() { return this.postForm.get('tags'); }
  get content() { return this.postForm.get('content'); }
  get image() { return this.postForm.get('image'); }

  get titleErrorRequired() {
    if (this.title.errors) {
      if (this.title.errors.required) {
        return true;
      }
    } else {
      return null;
    }
  }
  get titleErrorLengthMin() {
    if (this.title.errors) {
      if (this.title.errors.minlength) {
        return true;
      }
    } else {
      return null;
    }
  }
  get titleErrorLengthMax() {
    if (this.title.errors) {
      if (this.title.errors.maxlength) {
        return true;
      }
    } else {
      return null;
    }
  }
  get contentErrorRequired() {
    if (this.content.errors) {
      if (this.content.errors.required) {
        return true;
      }
    } else {
      return null;
    }
  }
  get contentErrorLengthMin() {
    if (this.content.errors) {
      if (this.content.errors.lengthErrorMin) {
        return true;
      }
    } else {
      return null;
    }
  }
  get contentErrorLengthMax() {
    if (this.content.errors) {
      if (this.content.errors.lengthErrorMax) {
        return true;
      }
    } else {
      return null;
    }
  }
  get categoryErrorRequired() {
    if (this.category.errors) {
      if (this.category.errors.required) {
        return true;
      }
    } else {
      return null;
    }
  }
  get tagsErrorRequired() {
    if (this.tags.errors) {
      if (this.tags.errors.requiredError) {
        return true;
      }
    } else {
      return null;
    }
  }
  get tagsErrorLength() {
    if (this.tags.errors) {
      if (this.tags.errors.lengthError) {
        return true;
      }
    } else {
      return null;
    }
  }
  get tagsErrorCharacter() {
    if (this.tags.errors) {
      if (this.tags.errors.characterError) {
        return true;
      }
    } else {
      return null;
    }
  }
  get imageErrorRequired() {
    if (this.image.errors) {
      if (this.image.errors.required) {
        return true;
      }
    } else {
      return null;
    }
  }
  get imageErrorInvalidMeme() {
    if (this.image.errors) {
      if (this.image.errors.invalidMimeType) {
        return true;
      }
    } else {
      return null;
    }
  }

  onSavePost() {
    if (this.postForm.invalid) { return; }
    // const userId = this.authService.getUserId();
    let post;
    let _id;
    if (this.mode === 'update') {
      _id = this.post._id;
    }
    const title = this.postForm.value.title;
    const content = this.postForm.value.content;
    const category = this.postForm.value.category;
    const subcategory = this.postForm.value.subcategory;
    const image = this.postForm.value.image;
    const tags = this.postForm.value.tags;
    post = {
      title,
      content,
      category,
      tags,
      image,
    };
    // post.subcategory = subcategory;
    if (subcategory) { post.subcategory = subcategory; }
    if (_id) { post._id = _id; }
    this.loadingPosts = true;
    this.postService.editPost(post, this.mode);
    // this.postForm.reset();
  }

  // Image
  // ----------------------------------

  onImagePickerClicked() {
    return timer(2000).subscribe(() => {
      if (!this.image.value) {
        this.image.markAsTouched();
      }
    });
  }
  onImagePicked(event: Event) {
    this.imageChangedEvent = event;
    const file = (event.target as HTMLInputElement).files[0];
    this.fileName = file.name;
    this.image.updateValueAndValidity();

    if (this.isIEOrEdge) {
      this.convertImgToDataUrl(file);
      this.postForm.patchValue({ image: file });
    }
  }
  public convertImgToDataUrl(file) {
    // convert image to data url
    // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
    };
    reader.readAsDataURL(file);
  }
  fileChangeEvent(event: any): void {
    if (this.isIEOrEdge) { return; }
    this.imageChangedEvent = event;
  }
  imageCropped(event: ImageCroppedEvent) {
    // this.croppedImage = event.base64;
    // const blobRes = await fetch(event.base64);
    // const blobValue = await blobRes.blob();
    // const file = this.blobToFile(blobValue, this.fileName);
    this.croppedImage = event.base64;
    const file = this.blobToFile(event.file, this.fileName);
    this.postForm.patchValue({ image: file });
  }
  imageLoaded() {
    this.showCropper = true;
  }
  cropperReady() {
  }
  loadImageFailed() {
  }
  public blobToFile(blobData, fileName: string) {
    const fd = new FormData();
    // fd.set('a', blobData);
    fd.set('a', blobData, fileName);
    return fd.get('a');
  }

  // Content
  // ----------------------------------
  contentHandler(event) {
    // this.content.markAsTouched();
  }


  // Categories
  // ----------------------------------
  onCategorySelected() {
    this.categoryselected = this.categories.find((x) => x.name === this.category.value);
    this.subcategory.setValue(null);
  }

  // Subcategories
  // ----------------------------------
  onSubcategoryOpen() {
    if (this.categoryselected) {
      this.subcategories = [...this.categoryselected.subcategories];
    }
  }

  // Tags
  // ----------------------------------

  private loadTags() {
    // if (this.tagsInput.length > 1) {
    //   this.tagsArray = this.postService.getTagNames(this.tagsInput);
    // }
    this.tagsArray =
      concat(
        of([]), // default items
        this.tagsInput
          .pipe(
            debounceTime(1000),
            distinctUntilChanged(),
            tap(() => this.loading = true),
            switchMap((name) => this.postService.getTagNames(name)
              .pipe(
                catchError(() => {
                  this.loading = false;
                  return of([]);
                }), // empty list on error
                tap(() => this.loading = false)
              ))
          )
      );
  }
  onOpen() {
    // manually mark as touched, as otherwise it doesnt get fired

    // this.tags.markAsTouched();
  }
  onAdd(tag) {
    this.tags.setValue([...this.tags.value, tag]);
  }
  customSearchFn = () => {
    console.log('custom search');

  }


  // time laps simulator
  addTagPromise(name) {
    this.loading = true;
    return from([name])
      .pipe(
        // delay(1000),
        tap(() => this.loading = false),
      )
      .toPromise();
  }

  // ng-select internal
  addTag(name) {
    return { name: name, tag: true };
  }
  onRemove(tag) {

  }

  // gives entire ng-select object (for debugging etc...)
  onChange(select) {
    // console.log(select);
    // console.log(select.itemsList.selectedItems);
    // console.log(this.selectTags);
  }

  onSearch(letter) {
    if (letter.term.length > 1) {
      this.searchedTag = letter.term;
    }
  }

  // content length must be between 200 and 100000
  public contentValidatorLengthMin(control: AbstractControl): { [key: string]: boolean } {
    let lengthErrorIndicator = false;
    const controlHtmlContent = this.renderer.createElement('DIV');
    controlHtmlContent.innerHTML = control.value;
    let text = controlHtmlContent.innerText || controlHtmlContent.textContent;
    text = text.replace(/\s+/g, '').trim();
    if (text.length < 200) {
      lengthErrorIndicator = true;
    }
    return lengthErrorIndicator ? { lengthErrorMin: true } : null;
  }
  // content length must be between 200 and 100000
  public contentValidatorLengthMax(control: AbstractControl): { [key: string]: boolean } {
    let lengthErrorIndicator = false;
    const controlHtmlContent = this.renderer.createElement('DIV');
    controlHtmlContent.innerHTML = control.value;
    let text = controlHtmlContent.innerText || controlHtmlContent.textContent;
    text = text.replace(/\s+/g, '').trim();
    if (text.length > 10000) {
      lengthErrorIndicator = true;
    }
    return lengthErrorIndicator ? { lengthErrorMax: true } : null;
  }
  // there must be at least one tag
  private tagsValidatorRequired(controls: AbstractControl): { [key: string]: boolean } {
    let requiredErrorIndicator = false;
    if (controls['value'].length === 0) {
      requiredErrorIndicator = true;
    }
    return requiredErrorIndicator ? { requiredError: true } : null;
  }
  // tags must be between 2 and 25 characters each
  private tagsValidatorLength(controls: AbstractControl): { [key: string]: boolean } {
    let lengthErrorIndicator = false;
    if (controls['value'].length > 0) {
      controls['value'].forEach((tag) => {
        if (!tag) { return null; }
        if (tag.length < 2 || tag.length > 25) {
          lengthErrorIndicator = true;
        }
      });
      return lengthErrorIndicator ? { lengthError: true } : null;
    } else {
      return null;
    }
  }
  private tagsValidatorCharacter(controls: AbstractControl): { [key: string]: boolean } {
    let characterErrorIndicator = false;
    const regex = /^[\w\-\s]+$/;
    if (controls['value'].length > 0) {
      controls['value'].forEach((tag) => {
        if (!tag) { return null; }
        if (!regex.test(tag)) {
          characterErrorIndicator = true;
        }
      });
      return characterErrorIndicator ? { characterError: true } : null;
    } else {
      return null;
    }
  }

  // fake suvice
  private addPosts(options) {
    const fakePostsCount = 6;
    let counter = 5;
    let post;
    const category = options.category;
    const subcategory = options.subcategory;
    const imageUrl = options.imageUrl;
    if (subcategory) {
      while (counter < fakePostsCount) {
        post = {
          title: `Fake ${subcategory} title ${counter} is above 10 characters`,
          content: `Fake ${subcategory} content ${counter}  Fake content   Fake content  Fake content  Fake content   Fake content   Fake content  Fake content   Fake content  Fake content  Fake content   Fake content  Fake content  Fake content   Fake content  Fake content  Fake content   Fake content   Fake content  Fake content   Fake content  Fake content  Fake content   Fake content Fake content  Fake content   Fake content  Fake content  Fake content   Fake content   Fake content  Fake content   Fake content  Fake content  Fake content   Fake content`,
          category: category,
          subcategory: subcategory,
          tags: [`${subcategory} ${counter}`],
          image: imageUrl,
        };
        this.postService.editPost(post, this.mode);
        counter += 1;
      }
    } else {
      while (counter < fakePostsCount) {
        post = {
          title: `Fake ${category} title ${counter} is above 10 characters`,
          content: `Fake ${category} content ${counter}  Fake content   Fake content  Fake content  Fake content   Fake content   Fake content  Fake content   Fake content  Fake content  Fake content   Fake content  Fake content  Fake content   Fake content  Fake content  Fake content   Fake content   Fake content  Fake content   Fake content  Fake content  Fake content   Fake content Fake content  Fake content   Fake content  Fake content  Fake content   Fake content   Fake content  Fake content   Fake content  Fake content  Fake content   Fake content`,
          category: category,
          tags: [`${category} ${counter}`],
          image: imageUrl,
        };
        this.postService.editPost(post, this.mode);
        counter += 1;
      }
    }

  }


  ngOnDestroy() {
  }

}

