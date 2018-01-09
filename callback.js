
doNextSet(sets, done);

nextSet([x,xs], next) {
  if xs
    nextRep(x, function() { nextSet(xs, next); });
  else
    nextRep(x, next);
}

nextRep([x,xs], next) {
	if xs
		wait(x, function() {
            nextRep(xs, next);
        });
    else
        wait(x, next);
}