<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('mission_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_id')->constrained('missions')->cascadeOnDelete();
            $table->foreignId('waypoint_id')->constrained('waypoints')->cascadeOnDelete();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamp('schedule')->nullable();
            $table->string('status')->default('pending'); // 'pending', 'in_progress', 'reached', 'skipped', 'failed'
            $table->timestamps();

            $table->index(['mission_id', 'order_index']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mission_items');
    }
};
