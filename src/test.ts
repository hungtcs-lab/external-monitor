import { timer } from "rxjs";
import { count, tap } from "rxjs/operators";

timer(0, 500)
  // .pipe(count())
  .pipe(tap(count => console.log(count)))
  .subscribe();
