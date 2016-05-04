describe('concurrent-async', function(){
    var ConcurrentAsync = require('../index');

    var concurrent = null;
    var fakeFunc = null;

    beforeEach(function(){
        concurrent = new ConcurrentAsync();
        fakeFunc = jasmine.createSpy('fakeFunc');
    });

    it('init status', function(){
        var st = concurrent.status();
        expect(st.isEnd).toBe(false);
        expect(st.isRunning).toBe(false);
        expect(st.asyncTotalNum).toBe(0);
        expect(st.endCallbackTotalNum).toBe(0);
    });

    describe('addAsync', function(){
        it('add asyncFunc', function(){
            var st = null;
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    next();
                }, 1);
            });
            st = concurrent.status();
            expect(st.isEnd).toBe(false);
            expect(st.isRunning).toBe(false);
            expect(st.asyncTotalNum).toBe(1);
            expect(st.endCallbackTotalNum).toBe(0);
        });
        it('will not excute asyncFunc before run', function(){
            concurrent.addAsync(function(next, handleError){
                fakeFunc();
                next();
            });
            expect(fakeFunc).not.toHaveBeenCalled();
        });
        it('will excute asyncFunc after run but not finish', function(done){
            var fakeFunc2 = jasmine.createSpy('fakeFunc2'),
                fakeFunc3 = jasmine.createSpy('fakeFunc3');

            concurrent.addAsync(function(next, handleError){
                fakeFunc();
                setTimeout(function(){
                    next();
                }, 100)
            }).run();
            expect(fakeFunc).toHaveBeenCalled();
            expect(concurrent.status().asyncTotalNum).toBe(1);

            concurrent.addAsync(function(next, handleError){
                fakeFunc2();
                setTimeout(function(){
                    next();
                }, 100)
            });
            expect(fakeFunc2).toHaveBeenCalled();
            expect(concurrent.status().asyncTotalNum).toBe(2);

            concurrent.end(function(){
                concurrent.addAsync(function(next, handleError){
                    fakeFunc2();
                    setTimeout(function(){
                        next();
                    }, 100)
                });
                expect(fakeFunc3).not.toHaveBeenCalled();
                expect(concurrent.status().asyncTotalNum).toBe(3);
                done();
            });
        });
    })

    describe('run', function(){
        it('start async', function(){
            var st = null;
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    next();
                }, 1);
            }).run();
            st = concurrent.status();
            expect(st.isEnd).toBe(false);
            expect(st.isRunning).toBe(true);
            expect(st.asyncTotalNum).toBe(1);
            expect(st.endCallbackTotalNum).toBe(0);
        });

        it('can not run again when it is still runing', function(){
            concurrent.addAsync(function(next, handleError){
                fakeFunc();
                setTimeout(function(){
                    next();
                }, 100);
            }).run();
            expect(fakeFunc.calls.count()).toBe(1);

            concurrent.run();
            expect(fakeFunc.calls.count()).toBe(1);
        });

        it('can run again after finish', function(done){
            var isCalled = false,
                fakeFunc2 = jasmine.createSpy('fakeFunc2');
            concurrent.addAsync(function(next, handleError){
                fakeFunc();
                setTimeout(function(){
                    next();
                }, 100);
            }).run();
            expect(fakeFunc.calls.count()).toBe(1);

            concurrent.end(function(){
                if (isCalled) {
                    done();
                    return;
                }
                isCalled = true;
                concurrent.addAsync(function(next, handleError){
                    fakeFunc2();
                    setTimeout(function(){
                        next();
                    }, 100);
                });
                concurrent.run();
                expect(fakeFunc.calls.count()).toBe(2);
                expect(fakeFunc2.calls.count()).toBe(1);
            });
        });
    });

    describe('end', function(){
        it('add endCallback', function(){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 100);
            }).end(function(err){
                // nothing
            }).end(function(err){
                // nothing
            });

            expect(concurrent.status().endCallbackTotalNum).toBe(2);
        });
        it('all endCallback will be called after finish', function(done){
            var fakeFunc2 = jasmine.createSpy('fakeFunc2');
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 100);
            }).end(function(err){
                fakeFunc();
            }).end(function(err){
                fakeFunc2();
            }).run();

            setTimeout(function(){
                expect(fakeFunc).toHaveBeenCalled();
                expect(fakeFunc2).toHaveBeenCalled();
                done();
            }, 300)
        });

        it('make sure all asyncFuc is excute finish', function(done){
            var st = null;
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 1);
            }).addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 2);
            }).addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 3);
            }).end(function(){
                st = concurrent.status();
                expect(st.isEnd).toBe(true);
                expect(st.isRunning).toBe(false);
                expect(st.asyncTotalNum).toBe(3);
                expect(st.asyncFinishedNum).toBe(st.asyncTotalNum);
                expect(fakeFunc.calls.count()).toEqual(st.asyncTotalNum);
                done();
            }).run();
        });
    });

    describe('error', function(){
        it('will let concurrent to end even other async is excuting', function(done){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    handleError('test error msg');
                }, 10);
            }).addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 100);
            }).end(function(err){
                expect(fakeFunc).not.toHaveBeenCalled();
                expect(concurrent.status().isEnd).toBe(true);
                expect(concurrent.status().isRunning).toBe(false);
                expect(err).toEqual('test error msg');
                done();
            }).run();
        });
        it('will take only the first error\'s message', function(done){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    handleError('test error msg');
                }, 10);
            }).addAsync(function(next, handleError){
                setTimeout(function(){
                    handleError('test error msg2');
                }, 1000);
            }).end(function(err){
                expect(err).toEqual('test error msg');
                done();
            }).run();
        });
        it('can not block the excuting async', function(){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    handleError('test error msg');
                }, 10);
            }).addAsync(function(next, handleError){
                setTimeout(function(){
                    fakeFunc();
                    next();
                }, 100);
            }).end(function(err){
                expect(fakeFunc).not.toHaveBeenCalled();
            }).run();

            setTimeout(function(){
                expect(fakeFunc).toHaveBeenCalled();
                done();
            }, 300);
        });
        it('can not trigger end again', function(){
            var fakeFunc2 = jasmine.createSpy('fakeFunc2');
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    handleError('test error msg');
                }, 10);
            }).addAsync(function(next, handleError){
                setTimeout(function(){
                    next();
                }, 100);
            }).end(function(err){
                fakeFunc2();
            }).run();

            setTimeout(function(){
                expect(fakeFunc2.calls.count()).toBe(1);
                done();
            }, 300);
        })
    });

    describe('destroy', function(){
        it('change status', function(done){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    next();
                }, 100);
            }).end(function(err){
                concurrent.destroy();
                expect(concurrent._isEnd).toBe(true);
                expect(concurrent._isRunning).toBe(false);
                expect(concurrent._isDestroy).toBe(true);
                expect(concurrent._asyncList).toBe(null);
                expect(concurrent._endCallback).toBe(null);
                done();
            }).run();
        });
        it('will not excute asyncFunc after destroy', function(){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    next();
                }, 100);
            }).end(function(err){
            }).run();
            concurrent.destroy();
            concurrent.addAsync(function(next, handleError){
                fakeFunc();
            });
            expect(fakeFunc).not.toHaveBeenCalled();
        });
        it('will not excute endCallback after destroy', function(){
            concurrent.addAsync(function(next, handleError){
                setTimeout(function(){
                    next();
                }, 100);
            }).end(function(err){
                fakeFunc();
            }).run();

            concurrent.destroy();

            setTimeout(function(){
                expect(fakeFunc).not.toHaveBeenCalled();
            }, 1000);
        });
    });
});
