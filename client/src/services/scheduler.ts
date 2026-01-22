export interface SchedulerTaskData {
  file: File;
  fileId: string;
  size: number;
}

interface QueuedTask {
  id: string;
  userId: string;
  data: SchedulerTaskData;
  run: () => Promise<void>;
  addedAt: number;
}

// 调度器
// 最大并发3个用户
// 最大并发9个文件
// 每个用户的并发数量文件：9 / 当前进入队列的用户
// 1个用户：9 / 1 = 9
// 2个用户：9 / 2 = Math.floor() -> 4
// ....

// 任务的定义：
// 一个文件对象即一个任务

// 每有一个任务加入进来 那么就重新进行调度 过程为同步
// 调度逻辑：
// 检查空缺并发（用户）
// 检查空缺任务
// 以任务添加顺序和文件大小进行排序
// 最先添加的和小文件先被处理

export class Scheduler {
  private static instance: Scheduler;
  private maxConcurrent = 9;
  private maxActiveUsers = 3;
  private pendingTasks: Map<string, QueuedTask[]> = new Map();
  private runningTasks: QueuedTask[] = [];

  private constructor() {}

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public addTask(
    userId: string,
    data: SchedulerTaskData,
    runFn: () => Promise<void>,
  ) {
    const task: QueuedTask = {
      id: data.fileId,
      userId,
      data,
      run: runFn,
      addedAt: Date.now(),
    };

    // 初始化
    if (!this.pendingTasks.has(userId)) {
      this.pendingTasks.set(userId, []);
    }
    this.pendingTasks.get(userId)!.push(task);

    this.schedule();
  }

  private schedule() {
    // 当前活跃的任务id
    const runningUserIds = new Set<string>();
    this.runningTasks.forEach((t) => runningUserIds.add(t.userId));
    // 当前等待的任务id
    const pendingUserIds = new Set<string>();
    this.pendingTasks.forEach((tasks, userId) => {
      if (tasks.length > 0) pendingUserIds.add(userId);
    });

    // 继续先处理当前活跃的用户里的剩余任务
    const activeUsers = new Set<string>(runningUserIds);

    // 如果当前并发用户不够
    if (activeUsers.size < this.maxActiveUsers) {
      const candidates = Array.from(pendingUserIds).filter(
        (uid) => !activeUsers.has(uid),
      );
      // 以添加任务的时间选择谁进入活跃队列
      candidates.sort((a, b) => {
        const tasksA = this.pendingTasks.get(a) || [];
        const tasksB = this.pendingTasks.get(b) || [];
        const firstA = tasksA[0] ? tasksA[0].addedAt : Infinity;
        const firstB = tasksB[0] ? tasksB[0].addedAt : Infinity;
        return firstA - firstB;
      });
      // 计算还需要几个并发用户
      const slots = this.maxActiveUsers - activeUsers.size;
      // 始终取最小：
      // 3 - 3 = 0
      // 3 - 2 = 1
      // 3 - 1 = 2
      for (let i = 0; i < Math.min(slots, candidates.length); i++) {
        const candidate = candidates[i];
        if (candidate) {
          // 进入活跃任务队列
          activeUsers.add(candidate);
        }
      }
    }

    if (activeUsers.size === 0) return;

    // 处理任务数量
    const userCount = activeUsers.size;
    const baseQuota = Math.floor(this.maxConcurrent / userCount);

    // 每个用户正在运行的任务数量
    const userRunningCount = new Map<string, number>();
    activeUsers.forEach((u) => userRunningCount.set(u, 0));
    this.runningTasks.forEach((t) => {
      userRunningCount.set(t.userId, (userRunningCount.get(t.userId) || 0) + 1);
    });
    // 活跃用户的任务还需要启动几次？
    activeUsers.forEach((userId) => {
      const running = userRunningCount.get(userId) || 0;
      const availableQuota = baseQuota - running;
      if (availableQuota > 0) {
        this.launchUserTasks(userId, availableQuota);
      }
    });
    // 在严格的每个用户最多只能跑 baseQuota 个任务的限制之外
    // 尽可能把剩余的并发用满 而且优先让最早加入队列的任务（不分用户）先跑起来。
    // 并发数并不是总能达到9
    // 当用户为数量 2、4、5、7、8 时则会空出
    const totalRunning = this.runningTasks.length;
    let freeSlots = this.maxConcurrent - totalRunning;

    if (freeSlots > 0) {
      const allRemaining: QueuedTask[] = [];
      activeUsers.forEach((userId) => {
        const tasks = this.pendingTasks.get(userId);
        if (tasks) allRemaining.push(...tasks);
      });

      if (allRemaining.length > 0) {
        allRemaining.sort((a, b) => a.addedAt - b.addedAt);
        const toRun = allRemaining.slice(0, freeSlots);
        toRun.forEach((task) => {
          this.removeTaskFromPending(task);
          this.startTask(task);
        });
      }
    }
  }

  private launchUserTasks(userId: string, maxCount: number) {
    const tasks = this.pendingTasks.get(userId);
    if (!tasks || tasks.length === 0) return;

    let canLaunch = this.maxConcurrent - this.runningTasks.length;
    let limit = Math.min(maxCount, canLaunch);

    if (limit <= 0) return;
    // 小文件优先处理
    tasks.sort((a, b) => a.data.size - b.data.size);

    const toRun = tasks.slice(0, limit);

    toRun.forEach((task) => {
      // 任务启动了 它不再处于等待
      this.removeTaskFromPending(task);
      this.startTask(task);
    });
  }

  private removeTaskFromPending(task: QueuedTask) {
    const userTasks = this.pendingTasks.get(task.userId);
    if (userTasks) {
      const idx = userTasks.indexOf(task);
      if (idx !== -1) {
        userTasks.splice(idx, 1);
      }
    }
  }

  private startTask(task: QueuedTask) {
    // 它正在被处理中
    this.runningTasks.push(task);

    task
      .run()
      .then(() => {
        // Success
      })
      .catch((err) => {
        console.error(`Task ${task.id} failed`, err);
      })
      .finally(() => {
        // 任务完成后 总是需要重新调度
        this.completeTask(task.id);
      });
  }

  private completeTask(taskId: string) {
    const idx = this.runningTasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this.runningTasks.splice(idx, 1);
    }
    this.schedule();
  }
}

export const scheduler = Scheduler.getInstance();
