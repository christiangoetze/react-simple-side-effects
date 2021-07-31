/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Dispatch, Middleware, PayloadAction } from "@reduxjs/toolkit";
import { Observable, Subject, tap, filter, map } from "rxjs";

export interface ActionPipelinePayload<T, AppState> {
  action: T;
  oldState: AppState;
  newState?: AppState;
  dispatch: Dispatch<PayloadAction<unknown>>;
}

const beforeDispatchPipeline$ = new Subject<
  ActionPipelinePayload<unknown, unknown>
>();
const afterDispatchPipeline$ = new Subject<
  ActionPipelinePayload<unknown, unknown>
>();

export const beforeDispatch = <T extends PayloadAction<unknown>, AppState>(
  actionType: string,
  effect: (event: ActionPipelinePayload<T, AppState>) => unknown
) => {
  return beforeDispatchPipeline$
    .pipe(
      // @ts-ignore
      ofType<T, AppState>(actionType),
      tap(({ action, oldState, dispatch }) =>
        effect({ action, oldState, dispatch })
      )
    )
    .subscribe();
};
export const afterDispatch = <T extends PayloadAction<unknown>, AppState>(
  actionType: string,
  effect: (event: ActionPipelinePayload<T, AppState>) => unknown
) => {
  return afterDispatchPipeline$
    .pipe(
      // @ts-ignore
      ofType<T, AppState>(actionType),
      tap(({ action, oldState, newState, dispatch }) =>
        effect({ action, oldState, newState, dispatch })
      )
    )
    .subscribe();
};

export const createMiddleware =
  <AppState>(): Middleware<unknown, AppState> =>
  (store) =>
  (next) =>
  (action) => {
    const oldState = store.getState();
    beforeDispatchPipeline$.next({
      action,
      oldState: store.getState(),
      dispatch: store.dispatch,
    });
    const result = next(action);
    afterDispatchPipeline$.next({
      action,
      oldState,
      newState: store.getState(),
      dispatch: store.dispatch,
    });
    return result;
  };

export function ofType<T extends PayloadAction<unknown>, AppState>(
  type: string
): (
  source$: Observable<ActionPipelinePayload<T, AppState>>
) => Observable<ActionPipelinePayload<T, AppState>> {
  return (source$) =>
    source$.pipe(
      filter(
        (event: ActionPipelinePayload<T, AppState>) =>
          event.action.type === type
      ),
      map((event) => event as ActionPipelinePayload<T, AppState>)
    );
}
