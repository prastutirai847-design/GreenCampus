import { classNames } from '../../utils/format.js';

export function Skeleton({ className }) {
  return <div className={classNames('animate-pulse rounded-lg bg-sand-200', className)} />;
}
