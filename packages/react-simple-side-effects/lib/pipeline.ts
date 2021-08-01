import { Subject } from "rxjs";
import { ActionPipelinePayload } from ".";

export const createBeforeDispatchPipeline = () => new Subject<ActionPipelinePayload>();
export const createAfterDispatchPipeline = () => new Subject<ActionPipelinePayload>();
