import { PayloadAction } from "@reduxjs/toolkit";
import { finalize, Subject } from "rxjs";
import { ActionPipelinePayload, createMiddleware, ofType } from "../lib";

type PipelinePayload = ActionPipelinePayload<PayloadAction<unknown>>;

describe("react-simple-side-effects", () => {
  describe("ofType", () => {
    it("should filter by single action type", (done) => {
      const pipeline$ = new Subject<PipelinePayload>();
      let passes = 0;
      pipeline$
        .pipe(
          ofType<PayloadAction<unknown>>("someAction"),
          finalize(() => {
            expect(passes).toBe(1);
            done();
          })
        )
        .subscribe((effect) => {
          passes++;
        });

      pipeline$.next({ action: { type: "someAction" } } as PipelinePayload);
      pipeline$.next({ action: { type: "anotherAction" } } as PipelinePayload);
      pipeline$.next({
        action: { type: "yetAnotherAction" },
      } as PipelinePayload);
      pipeline$.complete();
    });

    it("should filter by multiple action types", (done) => {
      const pipeline$ = new Subject<PipelinePayload>();
      let passes = 0;
      pipeline$
        .pipe(
          ofType<PayloadAction<unknown>>(["someAction", "anotherAction"]),
          finalize(() => {
            expect(passes).toBe(2);
            done();
          })
        )
        .subscribe((effect) => {
          passes++;
        });

      pipeline$.next({ action: { type: "someAction" } } as PipelinePayload);
      pipeline$.next({ action: { type: "anotherAction" } } as PipelinePayload);
      pipeline$.next({
        action: { type: "yetAnotherAction" },
      } as PipelinePayload);
      pipeline$.complete();
    });
  });

  describe("createMiddleware", () => {
    it("should create the middleware", () => {
      expect(createMiddleware()).toBeDefined();
    });
  });
});
